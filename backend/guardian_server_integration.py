from typing import Any

from guardian_routes import build_guardian_router


async def ensure_guardian_indexes(db: Any) -> None:
    """Create the single uniqueness boundary Guardian persistence requires."""
    await db.guardian_core_state.create_index("user_id", unique=True)


def install_guardian_core(app: Any, *, db: Any, get_current_user: Any) -> None:
    """Mount the verified Guardian Core router into the existing STAAR API."""
    app.include_router(
        build_guardian_router(db=db, get_current_user=get_current_user),
        prefix="/api",
    )
