"""Local-first runtime helpers. No automatic dispensing or medical decisions."""
from datetime import timedelta
from zoneinfo import ZoneInfo
from .policy import utcnow

async def schedule_tick(db, now=None):
    now=now or utcnow(); local=now.astimezone(ZoneInfo('America/Toronto'))
    async for row in db.petcare_events.find({'kind':'schedule_requested','data.at_local':local.strftime('%H:%M')}):
        key=f"{row['owner_id']}:{row['event_id']}:{local.date()}"
        await db.petcare_reminders.update_one({'_id':key},{'$setOnInsert':{'owner_id':row['owner_id'],'kind':row['data']['kind'],'created_at':now,'state':'human_action_required','delivery':'in_app_only'}},upsert=True)

async def retention_tick(db,now=None):
    now=now or utcnow()
    async for row in db.petcare_settings.find({'privacy.retention_days':{'$exists':True}}):
        days=row['privacy']['retention_days']
        if type(days) is int and 1<=days<=30:
            await db.petcare_observations.delete_many({'owner_id':row['_id'],'created_at':{'$lt':now-timedelta(days=days)}})

async def tick(db):
    from .watchdog import tick as watchdog_tick
    await watchdog_tick(db); await schedule_tick(db); await retention_tick(db)
