from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Table,
    Boolean,
)
from sqlalchemy.orm import declarative_base
from datetime import datetime
from sqlalchemy.types import JSON

Base = declarative_base()


class Subnet(Base):
    __tablename__ = "subnets"
    id = Column(Integer, primary_key=True)
    ssid = Column(String, unique=True)
    subnet = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    last_activity = Column(DateTime, default=datetime.now)
    updated_by = Column(String)
    netmask = Column(String)
    iface = Column(String)
    broadcast = Column(String)


def get_device_table(ssid):
    table_name = f"devices_{ssid.replace('-', '_').replace('.', '_')}"
    return Table(
        table_name,
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("ip_address", String),
        Column("hostname", String),
        Column("vendor", String),
        Column("mac_address", String),
        Column("status", String),
        Column("first_seen", DateTime),
        Column("last_seen", DateTime),
        Column("ports", JSON),
        extend_existing=True,
    )


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    ssid = Column(String)
    ip_address = Column(String)
    hostname = Column(String)
    message = Column(String)
    service = Column(String)
    read = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.now)


class Config(Base):
    __tablename__ = "configurations"
    id = Column(Integer, primary_key=True)
    host_discovery = Column(Boolean, default=True)
    host_discovery_interval = Column(Integer, default=10)
    host_discovery_notification = Column(Boolean, default=True)
    host_update_notification = Column(Boolean, default=True)
    host_updater = Column(Boolean, default=True)
    port_discovery_interval = Column(Integer, default=20)
    port_discovery_notification = Column(Boolean, default=True)
    port_scan = Column(Boolean, default=True)
    port_scan_top_ports = Column(Integer, default=100)
