"""Read-only GitHub repository adapter for Guardian.

Uses a server-side fine-grained GitHub token. No arbitrary URLs, repository
selection, branch mutation, or credentials are accepted from clients.
"""
import os
import httpx


class GitHubAdapterError(Exception):
    pass


def configured_repo():
    return os.environ.get("GUARDIAN_GITHUB_REPO", "").strip()


def permitted_actor(actor_id):
    allow = {s.strip() for s in os.environ.get("GUARDIAN_GITHUB_ALLOWED_USER_IDS", "").split(",") if s.strip()}
    return bool(allow and actor_id in allow)


async def _get_repo(client, repo, token):
    response = await client.get(
        f"https://api.github.com/repos/{repo}",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    if response.status_code != 200:
        raise GitHubAdapterError("github_read_unavailable")
    data = response.json()
    if data.get("full_name", "").casefold() != repo.casefold():
        raise GitHubAdapterError("repository_identity_mismatch")
    return {"full_name": data["full_name"], "default_branch": data["default_branch"],
            "private": bool(data["private"]), "id": data["id"]}


async def read_repository_with_readback(actor_id):
    repo = configured_repo()
    token = os.environ.get("GUARDIAN_GITHUB_READ_TOKEN", "").strip()
    if not permitted_actor(actor_id):
        raise PermissionError("github_access_denied")
    if not token or not repo or repo.count("/") != 1:
        raise GitHubAdapterError("github_adapter_not_configured")
    owner, name = repo.split("/")
    if not all(s and all(c.isalnum() or c in "-_." for c in s) for s in (owner, name)):
        raise GitHubAdapterError("invalid_repository_configuration")
    async with httpx.AsyncClient(timeout=12, follow_redirects=False) as client:
        first = await _get_repo(client, repo, token)
        second = await _get_repo(client, repo, token)
    if first != second:
        raise GitHubAdapterError("github_readback_mismatch")
    return first
