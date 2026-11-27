"""On-demand, read-only Toronto event discovery; never books or sends user data."""
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import APIRouter, Header, HTTPException, Response

ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json"
EVENT_ID = re.compile(r"[A-Za-z0-9_-]{1,128}\Z")
TICKETMASTER_HOSTS = {"ticketmaster.ca", "www.ticketmaster.ca", "ticketmaster.com", "www.ticketmaster.com"}


def safe_details(value):
    if not isinstance(value, str) or not 0 < len(value) < 1500:
        return None
    try:
        parts = urlsplit(value)
        if (parts.scheme != "https" or parts.netloc.lower() not in TICKETMASTER_HOSTS
            or not re.fullmatch(r"(?:/[A-Za-z0-9_-]+){0,3}/event/[A-Za-z0-9_-]+/?", parts.path, re.IGNORECASE)):
            return None
        return urlunsplit(("https", parts.netloc.lower(), parts.path, "", ""))
    except ValueError:
        return None


def dictionary(value):
    return value if isinstance(value, dict) else {}


def field(value, max_chars=120):
    return value.strip()[:max_chars] if isinstance(value, str) else ""


def parse_events(payload, start, end):
    if not isinstance(payload, dict) or not isinstance(payload.get("page"), dict):
        raise ValueError("unexpected provider response")
    raw = dictionary(payload.get("_embedded")).get("events")
    if raw is None and payload["page"].get("totalElements") == 0:
        return []
    if not isinstance(raw, list):
        raise ValueError("missing event list")
    results, seen = [], set()
    for item in raw[:25]:
        if not isinstance(item, dict):
            continue
        dates = dictionary(item.get("dates"))
        if dictionary(dates.get("status")).get("code") in ("cancelled", "postponed"):
            continue
        raw_start = dictionary(dates.get("start")).get("dateTime")
        if not isinstance(raw_start, str):
            continue
        try:
            at = datetime.fromisoformat(raw_start.replace("Z", "+00:00"))
        except ValueError:
            continue
        if at.tzinfo is None or not start <= at <= end:
            continue
        venues = dictionary(item.get("_embedded")).get("venues")
        venue = dictionary(venues[0]) if isinstance(venues, list) and venues else {}
        if field(dictionary(venue.get("city")).get("name")).casefold() != "toronto" or dictionary(venue.get("country")).get("countryCode") != "CA":
            continue
        eid, title = item.get("id"), field(item.get("name"), 180)
        if not isinstance(eid, str) or not EVENT_ID.fullmatch(eid) or eid in seen or not title:
            continue
        seen.add(eid)
        results.append({"id": eid, "title": title, "start": at.astimezone(timezone.utc).isoformat(),
                        "venue": field(venue.get("name")), "details_url": safe_details(item.get("url"))})
    if raw and not results and not any(isinstance(item, dict) for item in raw[:25]):
        raise ValueError("malformed event list")
    return sorted(results, key=lambda item: item["start"])


class HideDiscoveryRequestURL(logging.Filter):
    def filter(self, record):
        # Discovery requires a query-string credential. HTTPX INFO logging normally
        # prints the whole URL, so suppress that endpoint at its emitting logger.
        return ENDPOINT not in record.getMessage()


def build_community_discovery_router(*, require_account_user, limiter, http_client=None, clock=None):
    logger = logging.getLogger("httpx")
    if not any(isinstance(item, HideDiscoveryRequestURL) for item in logger.filters):
        logger.addFilter(HideDiscoveryRequestURL())
    router = APIRouter(prefix="/community/discovery")
    make_client = http_client or (lambda: httpx.AsyncClient(timeout=10, follow_redirects=False))
    time_now = clock or (lambda: datetime.now(timezone.utc))

    @router.get("/toronto")
    async def toronto(response: Response, authorization: str = Header(None)):
        user = await require_account_user(authorization)
        api_key = os.environ.get("TICKETMASTER_DISCOVERY_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(503, "ticketmaster_not_configured")
        limiter("ticketmaster_discovery:" + user["user_id"], 10, 300)
        limiter("ticketmaster_discovery_instance_burst", 4, 1)
        limiter("ticketmaster_discovery_instance_quota", 4500, 86400)
        start = time_now().astimezone(timezone.utc).replace(microsecond=0)
        end = start + timedelta(days=21)
        as_utc = lambda value: value.strftime("%Y-%m-%dT%H:%M:%SZ")
        try:
            async with make_client() as client:
                upstream = await client.get(ENDPOINT, params={
                    "apikey": api_key, "countryCode": "CA", "stateCode": "ON", "city": "Toronto",
                    "startDateTime": as_utc(start), "endDateTime": as_utc(end),
                    "size": 25, "sort": "date,asc", "includeTBA": "no", "includeTBD": "no", "includeTest": "no",
                })
            if upstream.status_code != 200:
                raise HTTPException(502, "ticketmaster_discovery_unavailable")
            events = parse_events(upstream.json(), start, end)
        except (httpx.HTTPError, ValueError):
            raise HTTPException(502, "ticketmaster_discovery_unavailable") from None
        response.headers["Cache-Control"] = "no-store"
        return {"source": "ticketmaster_discovery", "city": "Toronto", "read_at": start.isoformat(), "events": events}

    return router
