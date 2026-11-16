"""Offline regression for Guardian chat input validation, without a paid AI request.

This verifies the Pydantic boundary declared in backend/server.py, not provider
context limits or a deployed backend. Uses AST to avoid importing server side effects.
"""
import ast
from pathlib import Path

from pydantic import BaseModel, Field, ValidationError
import pytest


def _chat_model():
    server = Path(__file__).resolve().parents[1] / "server.py"
    module = ast.parse(server.read_text(encoding="utf-8"))
    model = next(node for node in module.body if isinstance(node, ast.ClassDef) and node.name == "ChatIn")
    message = next(node for node in model.body if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == "message")
    assert isinstance(message.value, ast.Call)
    bounds = {kw.arg: ast.literal_eval(kw.value) for kw in message.value.keywords if kw.arg in ("min_length", "max_length")}
    class ChatBoundary(BaseModel):
        message: str = Field(..., **bounds)
    return ChatBoundary


@pytest.mark.parametrize("size", [1, 2000, 2001, 4001, 49999, 50000])
def test_allowed_message_lengths(size):
    model = _chat_model()
    assert len(model(message="x" * size).message) == size


@pytest.mark.parametrize("size", [0, 50001])
def test_rejected_message_lengths(size):
    with pytest.raises(ValidationError):
        _chat_model()(message="x" * size)
