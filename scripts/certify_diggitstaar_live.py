#!/usr/bin/env python3
"""Non-mutating release gate: requires auth-protected live Gmail routes.

No credentials, OAuth codes, user data, provider credits or iPhone builds are used.
"""
import json
import os
import urllib.error
import urllib.request

origin = os.environ.get('STAAR_BACKEND_ORIGIN', 'https://cross-life-ai.emergent.host').rstrip('/')
paths = ['/api/connections', '/api/connections/gmail/inbox']
results = []
for path in paths:
    try:
        with urllib.request.urlopen(urllib.request.Request(origin + path, headers={'Accept': 'application/json'}), timeout=12) as response:
            code = response.status
    except urllib.error.HTTPError as error:
        code = error.code
    except Exception as error:
        results.append({'path': path, 'status': 'network_error', 'error': type(error).__name__, 'pass': False})
        continue
    results.append({'path': path, 'status': code, 'pass': code in (401, 403)})
print(json.dumps({'origin': origin, 'routes': results, 'certified': all(item['pass'] for item in results)}, indent=2))
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
