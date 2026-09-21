from pathlib import Path
import os
import sys
from typing import Any, Dict, Optional

from fastapi import FastAPI, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from guardian_routes import build_guardian_router  # noqa: E402

app = FastAPI(title="Guardian Runtime Verification")

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "staar")
client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[db_name] if client else None

class _UnavailableCollection:
    async def update_one(self, *args: Any, **kwargs: Any) -> Any:
        raise HTTPException(status_code=503, detail="verification_db_unavailable")

    async def find_one(self, *args: Any, **kwargs: Any) -> Any:
        raise HTTPException(status_code=503, detail="verification_db_unavailable")

class _DB:
    guardian_core_state = _UnavailableCollection()

verification_db = db if db is not None else _DB()

async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing_bearer")
    token = authorization[7:]
    if token == "verify-user-a":
        return {"user_id": "guardian-runtime-verify-a"}
    if token == "verify-user-b":
        return {"user_id": "guardian-runtime-verify-b"}
    raise HTTPException(status_code=401, detail="invalid_verification_token")

app.include_router(
    build_guardian_router(db=verification_db, get_current_user=get_current_user),
    prefix="/api",
)

@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "guardian": "runtime-verification",
        "mongoConfigured": bool(mongo_url),
    }
