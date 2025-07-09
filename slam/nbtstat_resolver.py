import subprocess
import xml.etree.ElementTree as ET


def get_nbtstat_name(ip):
    cmd = ["nmap", "--script", "nbstat", "-oX", "-", ip]
    device_info = {
        "ip": ip,
        "netbios_name": "Unknown",
        "netbios_user": "Unknown",
        "netbios_mac": "Unknown",
        "workgroup": "Unknown",
    }
    nbtname = ""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise RuntimeError(f"Nmap failed: {result.stderr}")
        root = ET.fromstring(result.stdout)

        for script in root.findall(".//hostscript/script"):
            sid = script.attrib.get("id", "")
            output = script.attrib.get("output", "")

            if sid == "nbstat":
                for line in output.splitlines():
                    if line.startswith("NetBIOS name:"):
                        device_info["netbios_name"] = line.split(":", 1)[1].strip()
                        nbtname = line.split(":", 1)[1].strip()
                    elif line.startswith("NetBIOS user:"):
                        device_info["netbios_user"] = line.split(":", 1)[1].strip()
                    elif line.startswith("NetBIOS MAC:"):
                        device_info["netbios_mac"] = line.split(":", 1)[1].strip()
                    elif "Workgroup:" in line:
                        device_info["workgroup"] = line.split(":", 1)[1].strip()

        return nbtname.split(",")[0]
    except Exception:
        return "Unknown"
