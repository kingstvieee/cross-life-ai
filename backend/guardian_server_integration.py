from typing import Any
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse

from guardian_routes import build_guardian_router
from guardian_control_routes import build_guardian_control_router
from guardian_control_store import GuardianControlStore


async def ensure_guardian_indexes(db: Any) -> None:
    """Create the single uniqueness boundary Guardian persistence requires."""
    await db.guardian_core_state.create_index("user_id", unique=True)
    await db.guardian_control_state.create_index("user_id", unique=True)


def install_guardian_core(app: Any, *, db: Any, get_current_user: Any, rate_limit=None) -> None:
    """Mount the verified Guardian Core router into the existing STAAR API."""
    app.include_router(
        build_guardian_router(db=db, get_current_user=get_current_user),
        prefix="/api",
    )
    # Pydantic error responses normally echo invalid inputs. Do not return
    # rejected secret-like material from the control surface to a model/client.
    previous = app.exception_handlers.get(RequestValidationError, request_validation_exception_handler)

    async def validation_error(request, exc):
        if request.url.path.startswith("/api/guardian/control"):
            errors = [{"loc": e["loc"], "type": e["type"], "msg": e["msg"]} for e in exc.errors()]
            return JSONResponse(status_code=422, content={"detail": errors})
        return await previous(request, exc)

    app.add_exception_handler(RequestValidationError, validation_error)

    @app.middleware("http")
    async def guardian_stop_gate(request, call_next):
        # Stop new work on legacy authenticated execution paths as well. Public
        # cached cinematic audio and passive local animations are not actions.
        guarded = {"/api/guardian/coordinate-evening", "/api/guardian/coordinate-morning", "/api/guardian/chat", "/api/guardian/chat-once", "/api/guardian/speak", "/api/guardian/speak-line", "/api/style-swap"}
        if request.method == "POST" and request.url.path in guarded:
            from fastapi import HTTPException
            try:
                user = await get_current_user(request.headers.get("authorization"))
                document = await GuardianControlStore(db.guardian_control_state).load(user["user_id"])
                if document["state"]["safe_mode"]:
                    return JSONResponse(status_code=409, content={"detail": "guardian_safe_mode_active"})
            except HTTPException as exc:
                return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        return await call_next(request)
    app.include_router(
        build_guardian_control_router(db=db, get_current_user=get_current_user, rate_limit=rate_limit),
        prefix="/api",
    )
