from slam.db import init_db, SessionLocal

init_db()
from slam.helper import banner, check_dependency
import sys

dependecy, msg = check_dependency()
if not dependecy:
    print(f"[-] All tools not Installed , Please install {msg}")
    sys.exit()
else:
    print(f"[+] All tools Installed")

from fastapi import FastAPI, Request, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, desc
from slam.scanner import (
    stream_discover_hosts,
    stream_port_scan,
)
from slam.models import Subnet, Notification, get_device_table
import threading
import json
from slam.host_discovery_daemon import disovery_run_forever
from slam.port_scan_daemon import port_scan_run_forever
from slam.ws_broadcast import start_ws_server
from slam.helper import update_configurations, read_notifications, get_network_info
from slam.config import load_config, HOST_DISCOVERY, HOST_UPDATER, PORT_SCAN

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

start_ws_server()

if HOST_DISCOVERY or HOST_UPDATER:
    threading.Thread(target=disovery_run_forever, daemon=True).start()
else:
    print(
        "Host Discovery and Host Updater are both disabled. Background service will not run."
    )

if PORT_SCAN:
    threading.Thread(target=port_scan_run_forever, daemon=True).start()
else:
    print("Port Scanner is disabled. Background service will not run.")


@app.get("/api/netinfo")
def netinfo():
    ssid, subnet, ip, netmask, iface, broadcast = get_network_info()
    return {
        "ssid": ssid,
        "subnet": subnet,
        "ip": ip,
        "netmask": netmask,
        "interface": iface,
        "broadcast": broadcast,
    }


@app.get("/api/subnets")
def list_subnets():
    session = SessionLocal()
    try:
        subnets = session.query(Subnet).order_by(Subnet.created_at.desc()).all()
        ssid, _, _, _, _, _ = get_network_info()
        return [
            {
                "id": s.id,
                "ssid": s.ssid,
                "subnet": s.subnet,
                "created_at": s.created_at.isoformat(),
                "last_activity": s.last_activity.isoformat(),
                "updated_by": s.updated_by,
                "netmask": s.netmask,
                "iface": s.iface,
                "broadcast": s.broadcast,
                "current": s.ssid == ssid,
            }
            for s in subnets
        ]
    finally:
        session.close()


@app.get("/api/devices")
def get_devices(ssid: str = Query(None)):
    session = SessionLocal()
    if not ssid:
        session.close()
        return []

    try:
        table = get_device_table(ssid)
        results = session.execute(select(table)).fetchall()
        return [
            {
                "ip_address": row.ip_address,
                "hostname": row.hostname,
                "status": row.status,
                "mac_address": row.mac_address,
                "vendor": row.vendor,
                "last_seen": row.last_seen.isoformat() if row.last_seen else None,
                "first_seen": row.first_seen.isoformat() if row.first_seen else None,
                "ports": row.ports if isinstance(row.ports, list) else [],
            }
            for row in results
        ]
    except Exception as e:
        print(f"Error accessing table for SSID '{ssid}': {e}")
        return []
    finally:
        session.close()


@app.get("/api/notifications")
def get_notifications():
    session = SessionLocal()
    try:
        items = session.query(Notification).order_by(desc(Notification.timestamp)).all()
        return [
            {
                "id": n.id,
                "ssid": n.ssid,
                "ip_address": n.ip_address,
                "hostname": n.hostname,
                "message": n.message,
                "service": n.service,
                "timestamp": n.timestamp.isoformat(),
                "read": n.read,
            }
            for n in items
        ]
    finally:
        session.close()


@app.get("/api/settings")
def get_settings():
    try:
        configs = load_config()
        return [configs]
    except Exception as e:
        return {"message": f"Error Occured : {e}"}


@app.post("/api/settings/update")
async def update_settings(request: Request):
    try:
        new_config_values = await request.json()
        update_configurations(new_config_values)
        return {"message": "Configurations updated successfully."}
    except Exception as e:
        return {"message": f"Error Occured : {e}"}


@app.post("/api/notifications/mark-read")
def mark_notifications_as_read():
    session = SessionLocal()
    try:
        read_notifications()
        return {"status": "ok"}
    finally:
        session.close()


@app.post("/api/notifications/delete")
def delete_notifications():
    session = SessionLocal()
    try:
        deleted = session.query(Notification).delete()
        # deleted=100
        session.commit()
        return {"deleted": deleted}
    finally:
        # session.close()
        pass


@app.get("/api/scan-stream")
def scan_stream(mode: str = Query("discover_hosts")):
    ssid, subnet, ip, netmask, iface, broadcast = get_network_info()

    def event_stream():
        count = 0
        if ssid != "Unknown":
            if mode == "discover_hosts":
                scan_generator = stream_discover_hosts(subnet, ssid)
            elif mode == "port_scan":
                scan_generator = stream_port_scan(subnet, ssid)
            else:
                yield f"data: {json.dumps({'error': 'Unsupported mode'})}\n\n"
                return

            for host in scan_generator:
                count += 1
                yield f"data: {json.dumps({'host': host})}\n\n"

            yield f"data: {json.dumps({'total': count})}\n\n"
            yield "event: done\ndata: end\n\n"
        else:
            yield f"data: {json.dumps({'total': count + 1})}\n\n"
            yield "event: done\ndata: end\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
