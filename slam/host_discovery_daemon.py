import time
from datetime import datetime
from sqlalchemy import select, insert, update
from slam.db import SessionLocal, ensure_device_table
from slam.models import Subnet, Notification, get_device_table
from slam.scanner import get_device_info, get_scanner_hostname, resolve_hostname
from slam.ws_broadcast import broadcast
import threading
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from slam.nbtstat_resolver import get_nbtstat_name
from slam.helper import get_ssid, get_network_info
import nmap
from slam.config import (
    HOST_DISCOVERY_INTERVAL,
    HOST_UPDATE_NOTIFICATION,
    HOST_DISCOVERY_NOTIFICATION,
)

scanner = nmap.PortScanner()


def discover_hosts(ssid):
    try:
        print("[+] Host Discovery Started")
        now = datetime.now()
        session = SessionLocal()
        subnet_entry = session.query(Subnet).filter_by(ssid=ssid).first()
        ssid, subnet, ip, netmask, iface, broadcast = get_network_info()
        if not subnet_entry:
            subnet_entry = Subnet(
                ssid=ssid,
                subnet=subnet,
                netmask=netmask,
                iface=iface,
                broadcast=broadcast,
                created_at=now,
                updated_by="Host Discovery Daemon",
            )
            session.add(subnet_entry)
            session.commit()

        subnet = subnet_entry.subnet
        ensure_device_table(ssid)
        table = get_device_table(ssid)
        session.commit()
        session.close()

        scanner.scan(hosts=subnet, arguments="-sn -T4")
        session = SessionLocal()
        existing_ips = {
            row[0] for row in session.execute(select(table.c.ip_address)).fetchall()
        }
        already_offline = {
            row[0]
            for row in session.execute(
                select(table.c.ip_address).where(table.c.status == "offline")
            ).fetchall()
        }
        offline_ips = list(set(existing_ips) - set(scanner.all_hosts()))
        all_ips = list(set(existing_ips).union(scanner.all_hosts()))
        session.commit()
        session.close()
        for ip in scanner.all_hosts():
            retry_attempts, retry_delay = 5, 2
            info = get_device_info(ip)
            mac = info["MAC"]
            vendor = info["Vendor"]
            hostname = get_scanner_hostname(scanner, ip) or info["Hostname"]
            if hostname == "Unknown":
                hostname = get_nbtstat_name(ip)
                if hostname == "Unknown":
                    hostname = resolve_hostname(ip)
            session = SessionLocal()
            for attempt in range(retry_attempts):
                try:
                    if ip not in existing_ips:
                        session.execute(
                            insert(table).values(
                                ip_address=ip,
                                hostname=hostname,
                                mac_address=mac,
                                vendor=vendor,
                                status="online",
                                first_seen=now,
                                last_seen=now,
                                ports=[],
                            )
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
                        session.execute(
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
                    subnet_entry.last_activity = now
                    subnet_entry.updated_by = "Host Discovery Daemon"
                    subnet_entry.netmask = netmask
                    subnet_entry.iface = iface
                    subnet_entry.broadcast = broadcast
                    session.add(subnet_entry)
                    session.commit()
                    session.close()
                    print(f"[+] Host discovery completed on SSID: {ssid}")
                    break
                except OperationalError as oe:
                    if "locked" in str(oe).lower():
                        print(
                            f"[-] DB Lock detected in Discovery Deamon. Retrying... ({attempt + 1}/{retry_attempts})"
                        )
                        session.rollback()
                        time.sleep(retry_delay)
                    else:
                        print(f"[-] DB Error in UPDATER: {oe}")
                        session.rollback()
                        break

                except SQLAlchemyError as e:
                    print("DB Error in UPDATER:", e)
                    session.rollback()
                    break
                except KeyError:
                    pass
                finally:
                    session.close()
        session = SessionLocal()
        for ip in offline_ips:
            if ip in offline_ips and ip not in already_offline:
                hostname = session.execute(
                    select(table.c.hostname).where(table.c.ip_address == ip)
                ).scalar()
                if hostname:
                    session.execute(
                        update(table)
                        .where(table.c.ip_address == ip)
                        .values(last_seen=now, status="offline")
                    )
                    if HOST_UPDATE_NOTIFICATION:
                        session.add(
                            Notification(
                                ssid=ssid,
                                ip_address=ip,
                                hostname=hostname,
                                service="Host Updater Service",
                                message=f"Host {hostname} ({ip}) is offline.",
                                timestamp=now,
                            )
                        )
        recovered_ips = already_offline & set(scanner.all_hosts())
        for ip in recovered_ips:
            hostname = session.execute(
                select(table.c.hostname).where(table.c.ip_address == ip)
            ).scalar()
            if hostname:
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
                            service="Host Updater Service",
                            message=f"Host {hostname} ({ip}) is back Online.",
                            timestamp=now,
                        )
                    )
        session.commit()
        session.close()
    except SQLAlchemyError as e:
        print("DB Error in DISCOVERY:", e)
        session.rollback()
    finally:
        session.close()


def send_ws_updates():
    while True:
        broadcast(
            {"discovery_daemon": "alive", "timestamp": datetime.now().isoformat()}
        )
        broadcast({"updater_daemon": "alive", "timestamp": datetime.now().isoformat()})
        time.sleep(3)


def disovery_run_forever():
    print("[+] 🚀 Starting Host Discovery Daemon")
    threading.Thread(target=send_ws_updates, daemon=True).start()
    time.sleep(3)
    while True:
        time.sleep((HOST_DISCOVERY_INTERVAL / 2) * 60)
        ssid = get_ssid()
        if ssid != "Unknown":
            discover_hosts(ssid)
        else:
            print("[-] Not Connected to Subnet")
        time.sleep((HOST_DISCOVERY_INTERVAL / 2) * 60)


if __name__ == "__main__":
    disovery_run_forever()
