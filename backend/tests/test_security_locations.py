"""Only public source addresses may supply approximate geography."""
import sys
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import security_locations as geo

class SecurityLocationTests(unittest.TestCase):
    def setUp(self):
        geo._security_geo_cache.clear()

    def test_private_loopback_reserved_and_missing_addresses_have_no_location(self):
        with patch.object(geo,'urlopen') as provider:
            for ip in ('127.0.0.1','::1','10.0.0.1','192.168.1.4','192.0.2.4',None,'invalid'):
                result=geo.location_fields(ip)
                self.assertIsNone(result['latitude'])
                self.assertIsNone(result['longitude'])
                self.assertEqual(result['location'],'Location unavailable')
                self.assertEqual(result['location_basis'],'UNAVAILABLE')
            provider.assert_not_called()

    def test_valid_public_provider_coordinates_and_city_are_cached(self):
        response=MagicMock()
        response.__enter__.return_value.read.return_value=b'{"success":true,"latitude":51.5,"longitude":-0.12,"city":"London","country":"United Kingdom"}'
        with patch.object(geo,'urlopen',return_value=response) as provider:
            result=geo.lookup_security_ip_location('8.8.8.8')
            self.assertEqual(result['city'],'London')
            located=geo.location_fields('8.8.8.8')
            self.assertEqual(located['location'],'London, United Kingdom')
            self.assertEqual(located['location_basis'],'IP_APPROXIMATE')
            self.assertEqual(provider.call_count,1)

    def test_failed_provider_does_not_fabricate_coordinates(self):
        with patch.object(geo,'urlopen',side_effect=OSError('unavailable')):
            result=geo.lookup_security_ip_location('8.8.8.8')
        self.assertIsNone(result['latitude'])
        self.assertIsNone(result['city'])

    def test_invalid_provider_coordinates_are_rejected(self):
        response=MagicMock()
        response.__enter__.return_value.read.return_value=b'{"success":true,"latitude":999,"longitude":-0.12,"city":"London"}'
        with patch.object(geo,'urlopen',return_value=response):
            result=geo.lookup_security_ip_location('8.8.8.8')
        self.assertIsNone(result['latitude'])
