"""Restricted signed-out Poppy discovery. Not a full Poppy/OAuth client.

Only operator-configured domains are reachable. DNS is checked and the selected
public IP is pinned to the TLS connection (with hostname certificate validation).
No redirects, cookies, auth headers, endpoint invocation, or write capability.
"""
import hashlib
import http.client
import ipaddress
import json
import socket
import ssl
from urllib.parse import urlsplit

PATH = '/.well-known/poppy.json'


def normalize_host(host):
    if not isinstance(host, str) or not host or len(host) > 253 or any(c in host for c in '/:@?#\\'):
        raise ValueError('invalid_company_host')
    value = host.encode('idna').decode('ascii').lower()
    if any(not part or len(part) > 63 or part[0] == '-' or part[-1] == '-' or not all(c.isalnum() or c == '-' for c in part) for part in value.split('.')):
        raise ValueError('invalid_company_host')
    return value


def public_addresses(host):
    addresses = sorted({item[4][0] for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)})
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError('non_public_company_address')
    return addresses


def project_discovery(host, document):
    if not isinstance(document, dict) or not isinstance(document.get('organization'), dict):
        raise ValueError('invalid_discovery_document')
    if document.get('protocol_version') != '1.0' or document['organization'].get('domain') != host:
        raise ValueError('company_or_version_mismatch')
    def validate_urls(value, key=''):
        if isinstance(value, dict):
            for name, child in value.items():
                validate_urls(child, name)
        elif isinstance(value, list):
            for child in value:
                validate_urls(child, key)
        elif isinstance(value, str) and (key in ('url', 'endpoint', 'issuer') or key.endswith(('_uri', '_endpoint'))):
            parsed = urlsplit(value)
            if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.fragment or parsed.port not in (None, 443):
                raise ValueError('unsafe_discovery_url')
            public_addresses(normalize_host(parsed.hostname))
    validate_urls(document)
    if not any(key in document for key in ('apis', 'agent', 'web')):
        raise ValueError('discovery_channel_required')
    # Human descriptions and skill instructions never become control-plane policy.
    return {'companyDomain': host, 'protocolVersion': '1.0', 'verification': 'discovery-only', 'accountAccess': False, 'authenticated': False,
            'channels': [key for key in ('apis', 'agent', 'web') if key in document],
            'documentHash': hashlib.sha256(json.dumps(document, sort_keys=True, allow_nan=False).encode()).hexdigest()}


class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, address):
        super().__init__(host, timeout=5, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        raw = socket.create_connection((self.address, 443), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except Exception:
            raw.close()
            raise


def discover(host, *, allowed_hosts):
    host = normalize_host(host)
    if host not in {normalize_host(h) for h in allowed_hosts}:
        raise ValueError('company_not_configured')
    address = public_addresses(host)[0]
    connection = PinnedHTTPS(host, address)
    try:
        connection.request('GET', PATH, headers={'Accept': 'application/json'})
        response = connection.getresponse()
        if response.status != 200:
            raise ValueError('discovery_non_success_or_redirect')
        if response.getheader('Content-Encoding', 'identity') != 'identity':
            raise ValueError('compressed_discovery_refused')
        body = response.read(65537)
        if len(body) > 65536:
            raise ValueError('discovery_too_large')
        def unique(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise ValueError('duplicate_json_key')
                result[key] = value
            return result
        document = json.loads(body, object_pairs_hook=unique)
        if not isinstance(document, dict):
            raise ValueError('invalid_discovery_document')
        return project_discovery(host, document)
    finally:
        connection.close()
