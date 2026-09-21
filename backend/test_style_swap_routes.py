import base64

import pytest
from fastapi import HTTPException

from style_swap_routes import (
    StyleSwapRequest,
    _decode_data_url,
    _prompt,
    build_style_swap_router,
)


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00"
)
DATA_URL = "data:image/png;base64," + base64.b64encode(PNG_BYTES).decode("ascii")


async def fake_current_user(authorization=None):
    return {"user_id": "test-user"}


def fake_rate_limit(*args, **kwargs):
    return None


def test_decode_valid_data_url():
    data, mime = _decode_data_url(DATA_URL, label="image")
    assert data == PNG_BYTES
    assert mime == "image/png"


def test_decode_rejects_non_data_url():
    with pytest.raises(HTTPException) as exc:
        _decode_data_url("x" * 40, label="image")
    assert exc.value.status_code == 400
    assert exc.value.detail == "image_must_be_base64_data_url"


def test_decode_rejects_unsupported_image_type():
    bad = "data:image/gif;base64," + base64.b64encode(b"GIF89a").decode("ascii")
    with pytest.raises(HTTPException) as exc:
        _decode_data_url(bad, label="mask")
    assert exc.value.detail == "mask_unsupported_type"


def test_prompt_locks_edit_to_selected_region():
    body = StyleSwapRequest(
        imageBase64=DATA_URL,
        maskBase64=DATA_URL,
        prompt="Replace the shirt with a white luxury shirt.",
        negativePrompt="face changes",
    )
    built = _prompt(body)
    assert "Edit only the white/selected region" in built
    assert "Preserve the person's identity" in built
    assert "face changes" in built


def test_router_exposes_authenticated_style_swap_contract():
    router = build_style_swap_router(
        get_current_user=fake_current_user,
        rate_limit=fake_rate_limit,
    )
    routes = {(route.path, ",".join(sorted(route.methods or []))) for route in router.routes}
    assert ("/style-swap/status", "GET") in routes
    assert ("/style-swap", "POST") in routes
