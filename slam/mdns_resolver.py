import socket
import threading
from zeroconf import Zeroconf, ServiceBrowser
from zeroconf._exceptions import BadTypeInNameException


SERVICE_TYPES = list(
    set(
        [
            "_smb._tcp.local.",
            "_ms-sql._tcp.local.",
            "_microsoft-ds._tcp.local.",
            "_rdp._tcp.local.",
            "_vnc._tcp.local.",
            "_ipp._tcp.local.",
            "_printer._tcp.local.",
            "_nfs._tcp.local.",
            "_ftp._tcp.local.",
            "_ssh._tcp.local.",
            "_afp._tcp.local.",
            "_http._tcp.local.",
            "_https._tcp.local.",
            "_airplay._tcp.local.",
            "_homekit._tcp.local.",
            "_airdrop._tcp.local.",
            "_mdns._udp.local.",
            "_services._dns-sd._udp.local.",
            "_googlecast._tcp.local.",
            "_cast._tcp.local.",
            "_dhcp._udp.local.",
            "_dns._udp.local.",
            "_upnp._udp.local.",
            "_nb._tcp.local.",
            "_nbns._udp.local.",
            "_mysql._tcp.local.",
            "_postgresql._tcp.local.",
            "_sip._tcp.local.",
            "_stun._tcp.local.",
            "_ntp._udp.local.",
            "_http-alt._tcp.local.",
            "_dns-sd._udp.local.",
        ]
    )
)


_hostname_cache = {}
_hostname_lock = threading.Lock()
_initialized = False
_zeroconf = None
_browsers = []


class CachingListener:
    def add_service(self, zeroconf, type_, name):
        try:
            info = zeroconf.get_service_info(type_, name)
            if info and info.addresses:
                ip = socket.inet_ntoa(info.addresses[0])
                hostname = info.server

                with _hostname_lock:
                    _hostname_cache[ip] = hostname
        except BadTypeInNameException:
            pass
        except Exception:
            pass

    def update_service(self, zeroconf, type_, name):
        self.add_service(zeroconf, type_, name)

    def remove_service(self, *args):
        pass


def _initialize():
    global _initialized, _zeroconf, _browsers
    if _initialized:
        return

    with threading.Lock():
        if _initialized:
            return

        _zeroconf = Zeroconf()
        listener = CachingListener()

        _browsers = [
            ServiceBrowser(_zeroconf, service_type, listener)
            for service_type in SERVICE_TYPES
        ]

        _initialized = True


def resolve_hostname(ip):
    """
    Returns mDNS hostname for an IP if discovered; otherwise 'Unknown'.
    """
    _initialize()

    with _hostname_lock:
        return _hostname_cache.get(ip, "Unknown")


def close_zeroconf():
    global _zeroconf, _browsers, _initialized
    if _zeroconf:
        _zeroconf.close()
    _zeroconf = None
    _browsers = []
    _initialized = False
