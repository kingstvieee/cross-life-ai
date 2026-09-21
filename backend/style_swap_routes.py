from __future__ import annotations

import base64
import binascii
import os
from typing import Any, Dict, Optional, Tuple

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field


_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
_MAX_DATA_URL_CHARS = 14_000_000
_PROVIDER_TIMEOUT = httpx.Timeout(120.0, connect=20.0)


class StyleSwapRequest(BaseModel):
    imageBase64: str = Field(..., min_length=32, max_length=_MAX_DATA_URL_CHARS)
    maskBase64: str = Field(..., min_length=32, max_length=_MAX_DATA_URL_CHARS)
    prompt: str = Field(..., min_length=3, max_length=1200)
    negativePrompt: Optional[str] = Field(default=None, max_length=600)


def _decode_data_url(value: str, *, label: str) -> Tuple[bytes, str]:
    if not value.startswith("data:") or ";base64," not in value:
        raise HTTPException(status_code=400, detail=f"{label}_must_be_base64_data_url")
    header, encoded = value.split(",", 1)
    mime = header[5:].split(";", 1)[0].lower()
    if mime not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"{label}_unsupported_type")
    try:
        data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"{label}_invalid_base64") from exc
    if not data or len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"{label}_too_large")
    return data, mime


def _filename(mime: str, stem: str) -> str:
    ext = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime]
    return f"{stem}.{ext}"


def _prompt(body: StyleSwapRequest) -> str:
    preserve = (
        "Edit only the white/selected region defined by the supplied mask. "
        "Preserve the person's identity, face, skin outside the mask, pose, body proportions, "
        "hands, hair, background, camera perspective, lighting, and every unmasked pixel as closely "
        "as the model permits. Produce a photorealistic fashion edit, not an illustration."
    )
    text = f"{body.prompt.strip()}\n\n{preserve}"
    if body.negativePrompt:
        text += f"\n\nAvoid: {body.negativePrompt.strip()}"
    return text


async def _openai_edit(
    *,
    image: bytes,
    image_mime: str,
    mask: bytes,
    mask_mime: str,
    prompt: str,
) -> Dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="style_swap_openai_not_configured")
    model = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-2")
    files = [
        ("image", (_filename(image_mime, "image"), image, image_mime)),
        ("mask", (_filename(mask_mime, "mask"), mask, mask_mime)),
    ]
    data = {"model": model, "prompt": prompt, "size": "auto", "quality": "high"}
    async with httpx.AsyncClient(timeout=_PROVIDER_TIMEOUT) as client:
        response = await client.post(
            "https://api.openai.com/v1/images/edits",
            headers={"Authorization": f"Bearer {api_key}"},
            data=data,
            files=files,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="style_swap_openai_failed")
    payload = response.json()
    rows = payload.get("data") or []
    if not rows:
        raise HTTPException(status_code=502, detail="style_swap_openai_empty")
    first = rows[0]
    if first.get("b64_json"):
        return {
            "imageUrl": f"data:image/png;base64,{first['b64_json']}",
            "provider": "openai",
            "model": model,
        }
    if first.get("url"):
        return {"imageUrl": first["url"], "provider": "openai", "model": model}
    raise HTTPException(status_code=502, detail="style_swap_openai_unrecognized_response")


async def _replicate_edit(
    *,
    image_data_url: str,
    mask_data_url: str,
    prompt: str,
    negative_prompt: Optional[str],
) -> Dict[str, Any]:
    api_token = os.environ.get("REPLICATE_API_TOKEN")
    version = os.environ.get("STYLE_SWAP_MODEL_VERSION")
    if not api_token or not version:
        raise HTTPException(status_code=503, detail="style_swap_replicate_not_configured")
    request_body = {
        "version": version,
        "input": {
            "image": image_data_url,
            "mask": mask_data_url,
            "prompt": prompt,
            "negative_prompt": negative_prompt or "",
            "strength": 0.85,
        },
    }
    headers = {
        "Authorization": f"Token {api_token}",
        "Content-Type": "application/json",
        "Prefer": "wait=60",
    }
    async with httpx.AsyncClient(timeout=_PROVIDER_TIMEOUT) as client:
        response = await client.post(
            "https://api.replicate.com/v1/predictions",
            headers=headers,
            json=request_body,
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail="style_swap_replicate_failed")
        prediction = response.json()
        if prediction.get("status") not in {"succeeded", "failed", "canceled"}:
            status_url = (prediction.get("urls") or {}).get("get")
            for _ in range(36):
                if not status_url:
                    break
                await __import__("asyncio").sleep(2)
                poll = await client.get(status_url, headers={"Authorization": f"Token {api_token}"})
                if poll.status_code >= 400:
                    raise HTTPException(status_code=502, detail="style_swap_replicate_poll_failed")
                prediction = poll.json()
                if prediction.get("status") in {"succeeded", "failed", "canceled"}:
                    break
    if prediction.get("status") != "succeeded":
        raise HTTPException(status_code=502, detail="style_swap_replicate_generation_failed")
    output = prediction.get("output")
    if isinstance(output, list):
        output = output[0] if output else None
    if not isinstance(output, str) or not output:
        raise HTTPException(status_code=502, detail="style_swap_replicate_empty")
    return {"imageUrl": output, "provider": "replicate", "model": version}


async def _stability_edit(
    *,
    image: bytes,
    image_mime: str,
    mask: bytes,
    mask_mime: str,
    prompt: str,
    negative_prompt: Optional[str],
) -> Dict[str, Any]:
    api_key = os.environ.get("STABILITY_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="style_swap_stability_not_configured")
    files = {
        "image": (_filename(image_mime, "image"), image, image_mime),
        "mask": (_filename(mask_mime, "mask"), mask, mask_mime),
    }
    data = {
        "prompt": prompt,
        "output_format": "png",
    }
    if negative_prompt:
        data["negative_prompt"] = negative_prompt
    async with httpx.AsyncClient(timeout=_PROVIDER_TIMEOUT) as client:
        response = await client.post(
            "https://api.stability.ai/v2beta/stable-image/edit/inpaint",
            headers={"Authorization": f"Bearer {api_key}", "Accept": "image/*"},
            files=files,
            data=data,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="style_swap_stability_failed")
    encoded = base64.b64encode(response.content).decode("ascii")
    return {
        "imageUrl": f"data:image/png;base64,{encoded}",
        "provider": "stability",
        "model": "stable-image-edit-inpaint",
    }


def build_style_swap_router(*, get_current_user: Any, rate_limit: Any) -> APIRouter:
    router = APIRouter(prefix="/style-swap", tags=["style-swap"])

    @router.get("/status")
    async def style_swap_status(authorization: Optional[str] = Header(None)):
        user = await get_current_user(authorization)
        rate_limit(f"style-swap-status:{user['user_id']}", 30, 60)
        provider = os.environ.get("STYLE_SWAP_PROVIDER", "openai").strip().lower()
        configured = {
            "openai": bool(os.environ.get("OPENAI_API_KEY")),
            "replicate": bool(os.environ.get("REPLICATE_API_TOKEN") and os.environ.get("STYLE_SWAP_MODEL_VERSION")),
            "stability": bool(os.environ.get("STABILITY_API_KEY")),
        }
        return {
            "enabled": configured.get(provider, False),
            "provider": provider,
            "configuredProviders": [name for name, ready in configured.items() if ready],
            "aiGeneratedDisclosure": True,
        }

    @router.post("")
    async def style_swap(body: StyleSwapRequest, authorization: Optional[str] = Header(None)):
        user = await get_current_user(authorization)
        rate_limit(f"style-swap:{user['user_id']}", 6, 3600)
        image, image_mime = _decode_data_url(body.imageBase64, label="image")
        mask, mask_mime = _decode_data_url(body.maskBase64, label="mask")
        provider = os.environ.get("STYLE_SWAP_PROVIDER", "openai").strip().lower()
        prompt = _prompt(body)

        if provider == "openai":
            result = await _openai_edit(
                image=image,
                image_mime=image_mime,
                mask=mask,
                mask_mime=mask_mime,
                prompt=prompt,
            )
        elif provider == "replicate":
            result = await _replicate_edit(
                image_data_url=body.imageBase64,
                mask_data_url=body.maskBase64,
                prompt=prompt,
                negative_prompt=body.negativePrompt,
            )
        elif provider == "stability":
            result = await _stability_edit(
                image=image,
                image_mime=image_mime,
                mask=mask,
                mask_mime=mask_mime,
                prompt=prompt,
                negative_prompt=body.negativePrompt,
            )
        else:
            raise HTTPException(status_code=503, detail="style_swap_provider_invalid")

        return {
            **result,
            "disclosure": "AI-generated style visualization. Product details may not exactly match real garments or jewelry.",
        }

    return router
