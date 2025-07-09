import time
import nmap
from datetime import datetime
from sqlalchemy import insert, update
from slam.db import SessionLocal, ensure_device_table
from slam.models import Subnet, Notification, get_device_table
from slam.ws_broadcast import broadcast
import threading
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from slam.helper import get_ssid, get_network_info
from slam.config import (
    PORT_DISCOVERY_NOTIFICATION,
    HOST_UPDATE_NOTIFICATION,
    PORT_SCAN_TOP_PORTS,
    PORT_DISCOVERY_INTERVAL,
)

scanner = nmap.PortScanner()


def port_scan_hosts(ssid):
    print("[+] Port Scan Started")
    session = SessionLocal()
    now = datetime.now()
    table = get_device_table(ssid)
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
            updated_by="Port Discovery Daemon",
        )
        session.add(subnet_entry)
        session.commit()
    subnet = subnet_entry.subnet
    ensure_device_table(ssid)
    devices = session.execute(table.select()).fetchall()
    session.commit()
    session.close()
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
                                    service="Port Discovery Service",
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
                    subnet_entry.last_activity = now
                    subnet_entry.updated_by = "Port Discovery Daemon"
                    subnet_entry.netmask = netmask
                    subnet_entry.iface = iface
                    subnet_entry.broadcast = broadcast
                    session.add(subnet_entry)
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
        except KeyError:
            pass
        except Exception as e:
            print(f"Error Occured in Port Scan Stream : {e}")
            pass
    session.close()


def send_ws_updates():
    while True:
        broadcast({"portscan_daemon": "alive", "timestamp": datetime.now().isoformat()})
        time.sleep(5)


def port_scan_run_forever():
    print("[+] 🚀 Starting Port Scan Daemon")
    threading.Thread(target=send_ws_updates, daemon=True).start()
    time.sleep(3)
    while True:
        ssid = get_ssid()
        if ssid != "Unknown":
            port_scan_hosts(ssid)
        else:
            print("[-] Not Connected to Subnet")
        time.sleep(PORT_DISCOVERY_INTERVAL * 60)


if __name__ == "__main__":
    port_scan_run_forever()
