from slam.db import SessionLocal
from slam.config import version
from slam.models import Config, Notification
import subprocess, socket, platform, shutil, netifaces, ipaddress, time
from sqlalchemy.exc import SQLAlchemyError, OperationalError


def get_network_info():
    ssid, _, ip, netmask, iface, broadcast = (
        "Unknown",
        "Unknown",
        "Unknown",
        "Unknown",
        "Unknown",
        "Unknown",
    )
    system = platform.system()
    # macOS network info
    if system == "Darwin":
        try:
            output = (
                subprocess.check_output(
                    "ipconfig getsummary en0 | awk -F ' SSID : ' '/ SSID : / {print $2}'",
                    shell=True,
                )
                .decode()
                .strip()
            )

            ssid = output if output else "Unknown"
        except Exception:
            ssid = "Unknown"
    # Linux network info
    elif system == "Linux":
        try:
            output = subprocess.check_output("iwgetid -r", shell=True).decode().strip()

            ssid = output if output else "Unknown"
        except Exception:
            ssid = "Unknown"

    # Get IP address, netmask, and broadcast information using netifaces
    try:
        iface = netifaces.gateways()["default"][netifaces.AF_INET][1]
        addr_info = netifaces.ifaddresses(iface)[netifaces.AF_INET][0]
        ip = addr_info["addr"]
        netmask = addr_info["netmask"]
        broadcast = addr_info.get("broadcast", "Unknown")
    except Exception:
        ip = "192.168.0.1"
        netmask = "255.255.255.255"
        broadcast = "Unknown"

    def netmask_to_cidr(ip, mask):
        network = ipaddress.IPv4Network(f"{ip}/{mask}", strict=False)
        return f"{network.network_address}/{network.prefixlen}"

    cidr = netmask_to_cidr(ip, netmask)

    return ssid, cidr, ip, netmask, iface, broadcast


def update_configurations(new_config_values):
    session = SessionLocal()
    try:
        config = session.query(Config).first()
        if config:
            for key, value in new_config_values.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            session.commit()
        else:
            raise ValueError("Configuration row does not exist.")

    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def get_device_info(ip):
    info = {"IP": ip, "MAC": "Unknown", "Vendor": "Unknown", "Hostname": "Unknown"}
    iface = netifaces.gateways()["default"][netifaces.AF_INET][1]
    if shutil.which("arp-scan"):
        try:
            out = subprocess.run(
                ["arp-scan", ip, "-x", "-d", "-I", f"{iface}"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout
            for line in out.splitlines():
                if ip in line:
                    parts = line.split("\t")
                    if len(parts) >= 3:
                        info["MAC"], info["Vendor"] = parts[1], parts[2]
        except:
            pass

    try:
        info["Hostname"] = socket.gethostbyaddr(ip)[0]
        print(f"[+] Host by Socket {socket.gethostbyaddr(ip)[0]}")
    except:
        pass

    return info


def read_notifications():
    retry_attempts, retry_delay = 5, 3
    for attempt in range(retry_attempts):
        try:
            session = SessionLocal()
            session.query(Notification).filter_by(read=False).update({"read": True})
            session.commit()
            break
        except OperationalError as oe:
            if "locked" in str(oe).lower():
                print(
                    f"DB Lock detected in Notifications. Retrying... ({attempt + 1}/{retry_attempts})"
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


def get_ssid():
    ssid = "Unknown"
    try:
        output = (
            subprocess.check_output(
                "ipconfig getsummary en0 | awk -F ' SSID : ' '/ SSID : / {print $2}'",
                shell=True,
            )
            .decode()
            .strip()
        )
        if output:
            ssid = output
    except Exception:
        ssid = "Unknown"
    return ssid


def check_dependency():
    tools = ["ipconfig", "arp-scan", "nmap"]
    missing_tools = []
    for tool in tools:
        if not shutil.which(tool):
            missing_tools.append(tool)
    if not missing_tools:
        return True, "All tools are installed."
    else:
        return False, f"Missing tools: {', '.join(missing_tools)}"


def banner():
    print(f"""\n
     ███████╗ ██╗       █████╗  ███╗   ███╗
     ██╔════╝ ██║      ██╔══██╗ ████╗ ████║
     ███████╗ ██║      ███████║ ██╔████╔██║
     ╚════██║ ██║      ██╔══██║ ██║╚██╔╝██║
     ███████║ ███████╗ ██║  ██║ ██║ ╚═╝ ██║
     ╚══════╝ ╚══════╝ ╚═╝  ╚═╝ ╚═╝     ╚═╝
       Simple Local Area Monitor - v {version}\n
     """)
