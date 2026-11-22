"""Additional mission safety regression tests."""
import pytest
from guardian_mission_engine import validate_transition

@pytest.mark.parametrize("evidence", [None, {}, {"passed": True}, {"verifier": "independent"}, {"verifier": "independent", "passed": False}, {"verifier": "self", "passed": True}])
def test_completion_rejects_unverified_evidence(evidence):
    with pytest.raises(ValueError):
        validate_transition("verifying", "completed", evidence=evidence)

def test_completion_accepts_independent_pass():
    validate_transition("verifying", "completed", evidence={"verifier": "independent", "passed": True})
