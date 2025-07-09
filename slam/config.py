from slam.models import Config
from slam.db import SessionLocal

version = "1.0"


def load_config():
    session = SessionLocal()
    config_dict = {}
    try:
        config = session.query(Config).first()
        if config:
            config_dict = {
                "host_discovery": config.host_discovery,
                "host_discovery_interval": config.host_discovery_interval,
                "host_discovery_notification": config.host_discovery_notification,
                "host_update_notification": config.host_update_notification,
                "host_updater": config.host_updater,
                "port_discovery_interval": config.port_discovery_interval,
                "port_discovery_notification": config.port_discovery_notification,
                "port_scan": config.port_scan,
                "port_scan_top_ports": config.port_scan_top_ports,
            }
    finally:
        session.close()

    return config_dict


config_values = load_config()

HOST_DISCOVERY = config_values.get("host_discovery", True)
PORT_SCAN = config_values.get("port_scan", True)
HOST_UPDATER = config_values.get("host_updater", True)
HOST_DISCOVERY_INTERVAL = config_values.get("host_discovery_interval", 15)
PORT_DISCOVERY_INTERVAL = config_values.get("port_discovery_interval", 30)
PORT_DISCOVERY_NOTIFICATION = config_values.get("port_discovery_notification", True)
HOST_DISCOVERY_NOTIFICATION = config_values.get("host_discovery_notification", True)
HOST_UPDATE_NOTIFICATION = config_values.get("host_update_notification", True)
PORT_SCAN_TOP_PORTS = config_values.get("port_scan_top_ports", 100)
