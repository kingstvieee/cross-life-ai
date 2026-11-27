"""Supervisor-driven polling; durable alerts, never claims external delivery."""
import asyncio
from .policy import DEVICES, device_status, utcnow

async def tick(db):
    async for profile in db.petcare_profiles.find({'configured':True}):
        owner=profile['_id']
        for device in DEVICES:
            row=await db.petcare_devices.find_one({'owner_id':owner,'device':device})
            status=device_status(row)
            await db.petcare_alerts.update_one({'_id':f'{owner}:{device}'},{'$set':{'owner_id':owner,'device':device,'status':status,'active':status!='live','checked_at':utcnow(),'external_delivery':'not_configured'}},upsert=True)

async def serve(db,stop):
    while not stop.is_set():
        await tick(db)
        try: await asyncio.wait_for(stop.wait(),10)
        except asyncio.TimeoutError: pass
