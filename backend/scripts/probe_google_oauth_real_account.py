#!/usr/bin/env python3
"""Non-destructive STAARHUB OAuth check; real account readback requires an owner session.

The probe never prints cookies, client secrets, OAuth codes, or bearer tokens.
It cannot certify end-to-end login without an actual user's Google completion.
"""
import argparse
import base64
import hashlib
import json
import os
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener=urllib.request.build_opener(NoRedirect)
def fetch(url, headers=None):
    request=urllib.request.Request(url,headers=headers or {"Accept":"application/json"})
    try:
        with opener.open(request,timeout=30) as res:
            return res.status,res.headers,res.read(4096)
    except urllib.error.HTTPError as exc:
        return exc.code,exc.headers,exc.read(4096)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--base',default='https://staarwardd-guardian-preview.onrender.com')
    args=ap.parse_args()
    base=args.base.rstrip('/')
    parsed=urllib.parse.urlparse(base)
    if parsed.scheme!='https' or not parsed.hostname or parsed.query or parsed.path or parsed.fragment:
        sys.exit("Invalid HTTPS backend origin")
    code,_,body=fetch(base+'/api/health/ready')
    ready=json.loads(body)
    if code!=200 or ready.get('status')!='ready' or ready.get('database')!='connected':
        sys.exit("FAIL: backend readiness")
    print('PASS: backend readiness/database')

    code,_,body=fetch(base+'/api/auth/providers')
    providers=json.loads(body)
    enabled={p['id']:p['enabled'] for p in providers['providers']}
    if code!=200 or not enabled.get('google') or not providers.get('nativeEnabled'):
        sys.exit("FAIL: Google or native login not configured")
    print('PASS: Google and native login enabled')

    verifier=secrets.token_urlsafe(32)
    challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    code,headers,_=fetch(base+'/api/auth/start/google?native_challenge='+challenge)
    auth0=urllib.parse.urlparse(headers.get('Location',''))
    q=urllib.parse.parse_qs(auth0.query)
    cookie=headers.get('Set-Cookie','')
    if not (code==302 and auth0.scheme=='https' and auth0.hostname=='staarwaardd-hub.ca.auth0.com'
            and auth0.path=='/authorize' and q.get('code_challenge_method')==['S256']
            and q.get('redirect_uri')==[base+'/api/auth/callback']
            and q.get('connection')==['google-oauth2']
            and len(q.get('state',[''])[0])>=30
            and 'Secure' in cookie and 'HttpOnly' in cookie):
        sys.exit("FAIL: guarded Auth0 redirect")
    print('PASS: Auth0 PKCE/state/secure cookie/callback')

    code,headers,_=fetch(headers['Location'])
    google=urllib.parse.urlparse(headers.get('Location',''))
    google_q=urllib.parse.parse_qs(google.query)
    cid=google_q.get('client_id',[''])[0]
    if code!=302 or google.hostname!='accounts.google.com' or not cid.endswith('.apps.googleusercontent.com'):
        sys.exit("FAIL: Auth0 to dedicated Google OAuth client")
    expected=os.getenv('STAAR_EXPECTED_GOOGLE_CLIENT_ID','')
    if expected and expected!=cid:
        sys.exit("FAIL: unexpected Google client ID")
    print('PASS: Google OAuth redirect; provider client ID valid'+(' and matched' if expected else ' (set STAAR_EXPECTED_GOOGLE_CLIENT_ID to pin)'))

    token=os.getenv('STAAR_QA_SESSION_TOKEN','').strip()
    if not token:
        print('PENDING: actual Google sign-in, callback exchange and authenticated account readback')
        return 2
    if len(token)<40 or len(token)>256 or not token.replace('-','').replace('_','').isalnum():
        sys.exit("FAIL: malformed owner session token")
    code,_,body=fetch(base+'/api/auth/me',{'Authorization':'Bearer '+token,'Accept':'application/json'})
    if code!=200:
        sys.exit("FAIL: authenticated /api/auth/me readback")
    user=json.loads(body)
    if not isinstance(user,dict) or not user.get('user_id') or not user.get('email') or user.get('is_demo'):
        sys.exit("FAIL: unverified account response")
    print('PASS: authenticated owner account readback (identity not printed)')
    print('NOTE: independent evidence of Google provider callback/token exchange must still be retained')
    return 0

if __name__=='__main__':
    sys.exit(main())
