#!/usr/bin/env python3
"""Read-only, identity-safe STAARHUB backend health and security probe.

PASS means preview HTTP/API controls work. It is NOT evidence of production
Mongo isolation, live Google account readback, backups, or a signed mobile app.
"""
import argparse
import json
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

class Probe:
    def __init__(self, base):
        parsed=urllib.parse.urlsplit(base)
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password or parsed.path not in ("","/") or parsed.query or parsed.fragment:
            raise ValueError("an HTTPS origin without credentials is required")
        self.base=base.rstrip("/")
        self.results=[]
    def check(self,name,passed,detail):
        self.results.append({"name":name,"passed":bool(passed),"detail":str(detail)[:180]})
    def fetch(self,path,method="GET",headers=None):
        req=urllib.request.Request(self.base+path,method=method,headers=headers or {"Accept":"application/json"})
        try:
            with urllib.request.urlopen(req,timeout=55) as r:
                return r.status,dict(r.headers),r.read(3500)
        except urllib.error.HTTPError as e:
            return e.code,dict(e.headers),e.read(3500)
    def execute(self):
        s,h,b=self.fetch("/api/health/live")
        self.check("liveness",s==200 and json.loads(b).get("status")=="alive",f"HTTP {s}")
        s,h,b=self.fetch("/api/health/ready")
        d=json.loads(b)
        self.check("database_ping",s==200 and d.get("status")=="ready" and d.get("database")=="connected",f"HTTP {s}, database {d.get('database')}")
        s,h,b=self.fetch("/api/auth/providers")
        data=json.loads(b);p={x.get("id"):x.get("enabled") for x in data.get("providers",[])}
        self.check("google_login_configured",s==200 and p.get("google") is True and data.get("nativeEnabled") is True,f"HTTP {s}, Google enabled")
        for name,path,headers in [
          ("anonymous_profile", "/api/auth/me",{}),
          ("invalid_bearer_profile","/api/auth/me",{"Authorization":"Bearer not-a-valid-token"}),
          ("anonymous_guardian_missions","/api/guardian/missions",{}),
          ("forged_oauth_callback","/api/auth/callback?state=x&code=x",{})]:
            s,h,b=self.fetch(path,headers=headers)
            self.check(name,s==401,f"HTTP {s}; expected 401")
        for name,origin,expected in [
          ("trusted_origin_cors",self.base,200),
          ("untrusted_origin_cors","https://untrusted.example.test",400)]:
            s,h,b=self.fetch("/api/auth/providers",method="OPTIONS",headers={"Origin":origin,"Access-Control-Request-Method":"GET"})
            allowed=h.get("Access-Control-Allow-Origin",h.get("access-control-allow-origin"))
            self.check(name,s==expected and (allowed==origin if expected==200 else not allowed),f"HTTP {s}, allowed={bool(allowed)}")
        # Nobody can certify auth by probing a redirect; only a real completed
        # owner account session, callback and readback can close that release gate.
        return {"schema":"staarhub-backend-security-probe-v1",
            "endpoint":self.base,"passed":sum(x["passed"] for x in self.results),
            "total":len(self.results),"results":self.results,
            "previewSecurityProbePassed":all(x["passed"] for x in self.results),
            "productionBackendCertified":False,
            "ownerGoogleReadbackCertified":False,
            "productionDbSeparationVerified":False,
            "backupsAndRecoveryVerified":False}
if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--base",required=True)
    args=parser.parse_args()
    try:
        result=Probe(args.base).execute()
        print(json.dumps(result,indent=2))
        sys.exit(0 if result["previewSecurityProbePassed"] else 1)
    except Exception as e:
        print(json.dumps({"probe_failed":type(e).__name__,"productionBackendCertified":False}))
        sys.exit(2)
