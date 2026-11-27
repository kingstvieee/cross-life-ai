"""PET-015–030: conservative event and control contracts, no actuator access."""
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field
from fastapi import Depends, HTTPException
from .policy import utcnow

class CareEvent(BaseModel):
    kind: Literal['water','portion','object','separation','baseline','communication','attendance','sync']
    value: float | None = Field(default=None,ge=0,le=100000)
    note: str = Field(default='',max_length=500)
    event_id: str = Field(pattern=r'^[a-zA-Z0-9_-]{8,100}$')

class Vet(BaseModel):
    name: str = Field(min_length=1,max_length=120)
    phone: str = Field(pattern=r'^[+0-9 ()-]{7,30}$')
    address: str = Field(min_length=1,max_length=300)

class Privacy(BaseModel):
    retention_days: int = Field(default=7,ge=1,le=30)
    caregiver_enabled: bool = False

class Intervention(BaseModel):
    action: Literal['stop_audio','pause_feeding','request_human_check','shutdown']


def register_advanced(r,db,owner):
    @r.get('/reminders')
    async def reminders(uid=Depends(owner)):
        return [x async for x in db.petcare_reminders.find({'owner_id':uid},{'_id':0,'owner_id':0}).sort('created_at',-1).limit(100)]
    @r.get('/alerts')
    async def alerts(uid=Depends(owner)):
        return [x async for x in db.petcare_alerts.find({'owner_id':uid,'active':True},{'_id':0,'owner_id':0}).limit(100)]
    @r.post('/observations')
    async def observe(body:CareEvent,uid=Depends(owner)):
        key={'_id':uid+':'+body.event_id}
        row={**body.model_dump(),'owner_id':uid,'created_at':utcnow(),'quality':'human_reported','verified':False}
        result=await db.petcare_observations.update_one(key,{'$setOnInsert':row},upsert=True)
        return {'accepted':result.upserted_id is not None,'verified':False,'actuation_enabled':False}
    @r.get('/report')
    async def report(uid=Depends(owner)):
        counts={}
        async for row in db.petcare_observations.aggregate([{'$match':{'owner_id':uid}},{'$group':{'_id':'$kind','count':{'$sum':1}}}]): counts[row['_id']]=row['count']
        return {'counts':counts,'scope':'all retained observations','safety':'unknown','clinical_diagnosis':False,'generated_at':utcnow()}
    @r.put('/vet')
    async def vet(body:Vet,uid=Depends(owner)):
        await db.petcare_settings.update_one({'_id':uid},{'$set':{'vet':body.model_dump()}},upsert=True)
        return {'saved':True,'contact_verified':False}
    @r.get('/vet')
    async def get_vet(uid=Depends(owner)):
        row=await db.petcare_settings.find_one({'_id':uid}) or {}
        return {'vet':row.get('vet'),'contact_verified':False}
    @r.put('/privacy')
    async def privacy(body:Privacy,uid=Depends(owner)):
        await db.petcare_settings.update_one({'_id':uid},{'$set':{'privacy':body.model_dump()}},upsert=True)
        if not body.caregiver_enabled: await db.petcare_grants.update_many({'owner_id':uid},{'$set':{'enabled':False}})
        return {'saved':True,'retention_enforced':False}
    @r.post('/intervention')
    async def intervention(body:Intervention,uid=Depends(owner)):
        await db.petcare_settings.update_one({'_id':uid},{'$set':{'automation_disabled':True,'last_intervention':body.action,'updated_at':utcnow()}},upsert=True)
        return {'automation_disabled':True,'physical_device_stop_confirmed':False,'human_check_required':True}
    @r.get('/control')
    async def control(uid=Depends(owner)):
        return {'automation_disabled':True,'physical_device_stop_confirmed':False,'hardware_verified':False}
