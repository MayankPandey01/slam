import nmap
from datetime import datetime
from slam.db import SessionLocal, ensure_device_table
from slam.mdns_resolver import resolve_hostname
from slam.models import Subnet, Notification, get_device_table
from sqlalchemy import insert, select, update, inspect
from sqlalchemy.exc import SQLAlchemyError, OperationalError
import time
from slam.nbtstat_resolver import get_nbtstat_name
from slam.helper import get_device_info
from slam.config import (
    HOST_UPDATE_NOTIFICATION,
    HOST_DISCOVERY_NOTIFICATION,
    PORT_DISCOVERY_NOTIFICATION,
    PORT_SCAN_TOP_PORTS,
)

scanner = nmap.PortScanner()


def get_scanner_hostname(scanner, ip):
    try:
        return scanner[ip].hostname()
    except Exception:
        return None


def stream_discover_hosts(subnet, ssid):
    session = SessionLocal()
    now = datetime.now()
    print(f"[+] Starting Host Discovery on {ssid}")
    # Ensure Subnet entry exists
    existing = session.query(Subnet).filter_by(ssid=ssid).first()
    if not existing:
        subnet_entry = Subnet(ssid=ssid, subnet=subnet, created_at=now)
        session.add(subnet_entry)
        session.commit()

    # Ensure per-SSID table exists
    ensure_device_table(ssid)
    table = get_device_table(ssid)
    session.commit()
    session.close()
    start_time = time.time()
    scanner.scan(hosts=subnet, arguments="-sn -T4")
    end_time = time.time()
    print(
        f"[+] IP discovery completed on SSID {ssid} Completed in {end_time - start_time:.2f} seconds."
    )
    for ip in scanner.all_hosts():
        try:
            start_time = time.time()
            retry_attempts, retry_delay = 5, 2
            info = get_device_info(ip)
            ip, mac, vendor = info["IP"], info["MAC"], info["Vendor"]
            hostname = get_scanner_hostname(scanner, ip) or info["Hostname"]
            if hostname == "Unknown":
                hostname = get_nbtstat_name(ip)
                if hostname == "Unknown":
                    hostname = resolve_hostname(ip)
            # Check if IP already exists in SSID table
            session = SessionLocal()
            result = session.execute(select(table.c.ip_address)).fetchall()
            existing_ips = {row[0] for row in result}
            for attempt in range(retry_attempts):
                try:
                    if ip not in existing_ips:
                        stmt = insert(table).values(
                            ip_address=ip,
                            hostname=hostname,
                            status="online",
                            mac_address=mac,
                            vendor=vendor,
                            first_seen=now,
                            last_seen=now,
                            ports=[],
                        )
                        if HOST_DISCOVERY_NOTIFICATION:
                            notif = Notification(
                                ssid=ssid,
                                ip_address=ip,
                                hostname=hostname,
                                message=f"New host discovered: {hostname} ({ip})",
                                timestamp=now,
                                service="Host Discovery Service",
                            )
                            session.add(notif)
                    else:
                        stmt = (
                            update(table)
                            .where(table.c.ip_address == ip)
                            .values(
                                hostname=hostname,
                                mac_address=mac,
                                vendor=vendor,
                                last_seen=now,
                                status="online",
                            )
                        )
                    session.execute(stmt)
                    session.commit()
                    break
                except OperationalError as oe:
                    if "locked" in str(oe).lower():
                        print(
                            f"DB Lock detected in Scanner. Retrying... ({attempt + 1}/{retry_attempts})"
                        )
                        session.rollback()
                        time.sleep(retry_delay)
                    else:
                        print(f"DB Error in UPDATER: {oe}")
                        session.rollback()
                        break

                except SQLAlchemyError as e:
                    print("DB Error in UPDATER:", e)
                    session.rollback()
                    break

                finally:
                    session.close()
            end_time = time.time()
            print(f"[+] Processed {ip} in {end_time - start_time:.2f} seconds.")
            yield {
                "ip_address": ip,
                "hostname": hostname,
                "mac_address": mac,
                "vendor": vendor,
                "status": "online",
                "last_seen": now.isoformat(),
                "ports": [],
            }
        except KeyError:
            pass
        except Exception as e:
            print(f"Error Occured in Discovery Scan Stream : {e}")
            pass
    session.close()


def stream_port_scan(subnet, ssid):
    session = SessionLocal()
    print(f"[+] Starting Port Scan on {ssid}")
    now = datetime.now()
    table = get_device_table(ssid)
    existing = session.query(Subnet).filter_by(ssid=ssid).first()
    if not existing:
        subnet_entry = Subnet(ssid=ssid, subnet=subnet, created_at=now)
        session.add(subnet_entry)
        session.commit()

    inspector = inspect(session.bind)
    if not inspector.has_table(table.name):
        ensure_device_table(ssid)
    session.commit()
    session.close()
    devices = session.execute(table.select()).fetchall()
    for device in devices:
        retry_attempts, retry_delay = 5, 2
        try:
            ip, hostname, old_ports, mac, vendor, status = (
                device.ip_address,
                device.hostname,
                device.ports,
                device.mac_address,
                device.vendor,
                device.status,
            )
            scanner.scan(hosts=ip, arguments=f"--top-ports {PORT_SCAN_TOP_PORTS} -T4")
            port_info = scanner[ip]
            open_ports = [
                p
                for p, d in port_info.get("tcp", {}).items()
                if d.get("state") == "open"
            ]
            newly_discovered_ports = list(set(open_ports) - set(old_ports))
            session = SessionLocal()
            for attempt in range(retry_attempts):
                try:
                    if status == "offline":
                        session.execute(
                            update(table)
                            .where(table.c.ip_address == ip)
                            .values(last_seen=now, status="online")
                        )
                        if HOST_UPDATE_NOTIFICATION:
                            session.add(
                                Notification(
                                    ssid=ssid,
                                    ip_address=ip,
                                    hostname=hostname,
                                    service="Host Updater Daemon",
                                    message=f"Host {hostname} ({ip}) is back Online.",
                                    timestamp=now,
                                )
                            )
                    stmt = (
                        update(table)
                        .where(table.c.ip_address == ip)
                        .values(last_seen=now, status="online", ports=open_ports)
                    )
                    result = session.execute(stmt)
                    if result.rowcount == 0:
                        stmt = insert(table).values(
                            last_seen=now, status="online", ports=open_ports
                        )
                        session.execute(stmt)
                    session.commit()
                    if len(newly_discovered_ports) != 0:
                        if PORT_DISCOVERY_NOTIFICATION:
                            notif = Notification(
                                ssid=ssid,
                                ip_address=ip,
                                hostname=hostname,
                                message=f"New Open Ports discovered: {hostname} ({ip})\n {newly_discovered_ports}",
                                timestamp=now,
                                service="Port Discovery Service",
                            )
                            session.add(notif)
                            session.commit()
                    break
                except OperationalError as oe:
                    if "locked" in str(oe).lower():
                        print(
                            f"DB Lock detected. Retrying... ({attempt + 1}/{retry_attempts})"
                        )
                        session.rollback()
                        time.sleep(retry_delay)
                    else:
                        print(f"DB Error in UPDATER: {oe}")
                        session.rollback()
                        break
                except SQLAlchemyError as e:
                    print("DB Error in UPDATER:", e)
                    session.rollback()
                    break
                except Exception as e:
                    print("DB Error in UPDATER:", e)
                    session.rollback()
                    break

                finally:
                    session.close()
                    if attempt == retry_attempts - 1:
                        print("Max retry attempts reached. Exiting.")
            yield {
                "ip_address": ip,
                "hostname": hostname,
                "mac_address": mac,
                "vendor": vendor,
                "status": "online",
                "last_seen": now.isoformat(),
                "ports": open_ports,
            }
        except KeyError:
            pass
        except Exception as e:
            print(f"Error Occured in Port Scan Stream : {e}")
            pass
    session.close()
