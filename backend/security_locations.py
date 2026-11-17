# Approximate public-IP geolocation for SOC visualization.
# Private, loopback and otherwise non-global addresses are never geolocated.
import ipaddress
import json
import ssl
import certifi
from urllib.request import Request, urlopen
from urllib.parse import quote

import time
from concurrent.futures import ThreadPoolExecutor

_security_geo_cache = {}
_security_geo_pending = {}
_security_geo_pool = ThreadPoolExecutor(max_workers=6, thread_name_prefix="soc-geo")

def lookup_security_ip_location(source_ip):
    empty = {
        "latitude": None,
        "longitude": None,
        "city": None,
        "country": None
    }

    if not source_ip:
        return empty.copy()

    try:
        ip = ipaddress.ip_address(source_ip.strip())
    except ValueError:
        return empty.copy()

    if not ip.is_global:
        return empty.copy()

    key = str(ip)

    cached = _security_geo_cache.get(key)
    if cached and cached[0] > time.monotonic():
        return cached[1].copy()

    result = empty.copy()

    try:
        url = "https://ipwho.is/" + quote(key, safe="")
        request_geo = Request(
            url,
            headers={"User-Agent": "RussellWealth-SOC/1.0"}
        )

        with urlopen(request_geo, timeout=2, context=ssl.create_default_context(cafile=certifi.where())) as response:
            payload = json.load(response)

        if payload.get("success") is True:
            lat = payload.get("latitude")
            lon = payload.get("longitude")

            if (
                isinstance(lat, (int, float))
                and not isinstance(lat, bool)
                and isinstance(lon, (int, float))
                and not isinstance(lon, bool)
                and -90 <= lat <= 90
                and -180 <= lon <= 180
            ):
                result = {
                    "latitude": lat,
                    "longitude": lon,
                    "city": payload.get("city")[:200] if isinstance(payload.get("city"), str) else None,
                    "country": payload.get("country")[:200] if isinstance(payload.get("country"), str) else None
                }

    except Exception:
        pass

    if len(_security_geo_cache) >= 4096:
        _security_geo_cache.clear()
    _security_geo_cache[key] = (time.monotonic() + (86400 if result["latitude"] is not None else 60), result.copy())
    return result


def security_map_location(source_ip):
    """Keep polling responsive while public-IP lookups run in the background."""
    empty = lookup_security_ip_location(None)
    try:
        key = str(ipaddress.ip_address(source_ip))
        if not ipaddress.ip_address(key).is_global:
            return empty
    except (ValueError, TypeError):
        return empty
    cached = _security_geo_cache.get(key)
    if cached and cached[0] > time.monotonic():
        _security_geo_pending.pop(key, None)
        return cached[1].copy()
    pending = _security_geo_pending.get(key)
    if pending is not None and pending.done():
        _security_geo_pending.pop(key, None)
        return pending.result()
    # Bound work even if the event stream contains many distinct source addresses.
    for finished in [ip for ip, job in list(_security_geo_pending.items()) if job.done()]:
        _security_geo_pending.pop(finished, None)
    if key not in _security_geo_pending and len(_security_geo_pending) < 256:
        _security_geo_pending[key] = _security_geo_pool.submit(lookup_security_ip_location, key)
    return empty


def location_fields(source_ip, lookup=None):
    location = dict((lookup or security_map_location)(source_ip))
    location['location_basis'] = 'IP_APPROXIMATE' if location['latitude'] is not None else 'UNAVAILABLE'
    location['location'] = ', '.join(value for value in (location.get('city'), location.get('country')) if value) or 'Location unavailable'
    return location
