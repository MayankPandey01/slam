# db.py
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from slam.models import Base, Config, get_device_table

engine = create_engine(
    "sqlite:///slam.db", connect_args={"check_same_thread": False, "timeout": 20}
)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    try:
        print("[+] Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("[+] Tables created successfully.")
    except Exception as e:
        print(f"[-] Error during table creation: {e}")

    # Set the PRAGMA settings
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.execute(text("PRAGMA synchronous=NORMAL"))

    session = SessionLocal()
    try:
        config = session.query(Config).first()
        if not config:
            default_config = Config(
                host_discovery=True,
                host_discovery_interval=15,
                host_discovery_notification=True,
                host_update_notification=True,
                host_updater=True,
                port_discovery_interval=30,
                port_discovery_notification=True,
                port_scan=True,
                port_scan_top_ports=100,
            )
            session.add(default_config)
            session.commit()
            print("[+] Default configuration inserted.")
        else:
            print("[+] Configuration already exists.")
    except Exception as e:
        session.rollback()
        print(f"[-] Error inserting default config: {e}")
    finally:
        session.close()


def ensure_device_table(ssid):
    table = get_device_table(ssid)
    inspector = inspect(engine)
    if not inspector.has_table(table.name):
        table.create(engine)
