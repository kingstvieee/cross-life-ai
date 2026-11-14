"""Account- and privacy-scoped continuity shared by Atlas and Kaia."""
from datetime import timedelta


def history_query(user, portal, policy_key):
    return {'user_id': user['user_id'], 'portal': portal, 'policy_key': policy_key}


async def load_history(collection, user, portal, policy_key, now, limit=12):
    if user.get('is_demo') or user.get('cross_life_paused'):
        return []
    query = history_query(user, portal, policy_key)
    query['expires_at'] = {'$gt': now}
    rows = await collection.find(query, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(length=limit)
    return list(reversed(rows))


async def save_turn(collection, user, portal, policy_key, message, reply, companion, now):
    if user.get('is_demo') or user.get('cross_life_paused'):
        return
    await collection.insert_one({**history_query(user, portal, policy_key),
                                 'message': message, 'reply': reply, 'companion': companion,
                                 'created_at': now, 'expires_at': now + timedelta(days=30)})


def public_history(rows):
    return [{'message': r['message'], 'reply': r['reply'], 'companion': r.get('companion', 'guardian')} for r in rows]
