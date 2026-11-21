"""Unit tests for Guardian mission state and authorization policy.

Run: cd backend && python -m pytest tests/test_guardian_mission_engine.py
"""
import pytest
from guardian_mission_engine import ALLOWED, authorize_action, validate_transition


def test_all_allowed_transitions():
    for source, destinations in ALLOWED.items():
        for target in destinations:
            if target == "completed":
                validate_transition(source, target, evidence={"verifier": "independent", "passed": True})
            else:
                validate_transition(source, target)


@pytest.mark.parametrize("source,target", [
    ("proposed", "completed"),
    ("queued", "running"),
    ("running", "completed"),
    ("completed", "queued"),
    ("cancelled", "approved"),
])
def test_forbidden_transitions(source, target):
    with pytest.raises(ValueError):
        validate_transition(source, target)


def test_completion_requires_evidence():
    with pytest.raises(ValueError):
        validate_transition("verifying", "completed")


@pytest.mark.parametrize("approved,scope,scopes,cost,budget,expected", [
    (True, "read", {"read"}, 0, 0, True),
    (False, "read", {"read"}, 0, 0, False),
    (True, "publish", {"read"}, 0, 0, False),
    (True, "read", {"read"}, 11, 10, False),
    (True, "read", {"read"}, -1, 10, False),
])
def test_action_authorization(approved, scope, scopes, cost, budget, expected):
    assert authorize_action(approved=approved, action_scope=scope,
                            granted_scopes=scopes, cost_cad=cost,
                            budget_cad=budget) is expected
