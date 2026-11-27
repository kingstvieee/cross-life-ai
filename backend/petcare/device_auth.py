"""Owner-scoped device credentials; store only token digests."""
import hashlib, secrets, hmac

def issue_token():
    token=secrets.token_urlsafe(32)
    return token,digest(token)

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()

def valid_token(token,stored):
    return isinstance(token,str) and isinstance(stored,str) and hmac.compare_digest(digest(token),stored)
