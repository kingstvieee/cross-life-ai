"""Dependency-light structural verification of seven Guardian Core portal gates.

This is not a live provider or end-to-end enforcement test.
"""
import ast
from pathlib import Path

import pytest

ROUTES = Path(__file__).resolve().parents[1] / "guardian_routes.py"
EXPECTED = {
    "creativity", "work", "home", "wellbeing",
    "relationships", "community", "style",
}

def inspect_routes():
    tree = ast.parse(ROUTES.read_text(encoding="utf-8"))
    assignment = next(node for node in tree.body if isinstance(node, ast.Assign)
                      and any(isinstance(t, ast.Name) and t.id == "GUARDIAN_CORE_PORTALS"
                              for t in node.targets))
    portal_set = ast.literal_eval(assignment.value.args[0])
    builder = next(n for n in tree.body if isinstance(n, ast.FunctionDef)
                   and n.name == "build_guardian_router")
    contribution = next(n for n in ast.walk(builder) if isinstance(n, ast.AsyncFunctionDef)
                        and n.name == "workflow_contribution")
    return portal_set, contribution

def test_exactly_seven_canonical_portals():
    portals, _ = inspect_routes()
    assert portals == EXPECTED

def test_portal_validation_occurs_before_store_write():
    _, route = inspect_routes()
    statements = route.body
    check = next(i for i, node in enumerate(statements)
                 if isinstance(node, ast.If)
                 and isinstance(node.test, ast.Compare)
                 and isinstance(node.test.left, ast.Attribute)
                 and node.test.left.attr == "portal_id")
    store = next(i for i, node in enumerate(statements)
                 if any(isinstance(n, ast.Attribute) and n.attr == "add_portal_contribution"
                        for n in ast.walk(node)))
    assert check < store
    assert any(isinstance(n, ast.Constant) and n.value == "guardian_unknown_portal"
               for n in ast.walk(statements[check]))

@pytest.mark.parametrize("portal", sorted(EXPECTED))
def test_each_portal_is_in_allowlist(portal):
    portals, _ = inspect_routes()
    assert portal in portals
