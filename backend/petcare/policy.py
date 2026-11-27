"""Fail-closed pet care policy; no physical actuator dispatch."""
from datetime import datetime, timezone

DEVICES = ('camera','feeder','climate','audio')

def utcnow():
    return datetime.now(timezone.utc)

def device_status(row, now=None):
    if not row or not row.get('verified'):
        return 'unavailable'
    stamp = row.get('received_at')
    if not isinstance(stamp, datetime):
        return 'unavailable'
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    age = ((now or utcnow()) - stamp).total_seconds()
    return 'live' if 0 <= age <= 30 else 'stale'

def feeding_allowed(grams, used, limit, uncertain=False):
    return not uncertain and 0 < grams <= limit and 0 <= used <= limit-grams

def distress_level(label, confidence):
    if label == 'emergency': return 'urgent_human_review'
    if label in ('bark','whine','distress') and confidence >= .7: return 'human_review'
    return 'unclassified'
