"""Account-scoped pet-care API. Hardware dispatch intentionally disabled until verified."""
from datetime import date
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from .policy import DEVICES, utcnow, device_status, distress_level

class Profile(BaseModel):
    name: Literal['STAAR'] = 'STAAR'
    breed: str = Field(default='Advertised Cane Corso × Great Pyrenees', max_length=120)
    birthday: date = date(2026,9,6)
    sex: Literal['female'] = 'female'
    homecoming: date = date(2026,11,25)

class Entry(BaseModel):
    kind: Literal['activity','toilet','vaccination','medical','weight','feeding_observation','distress','caregiver_visit']
    note: str = Field(min_length=1,max_length=1000)
    weight_kg: float | None = Field(default=None,gt=0,le=150)

class Schedule(BaseModel):
    kind: Literal['feeding','toilet','caregiver','rest']
    at_local: str = Field(pattern=r'^([01][0-9]|2[0-3]):[0-5][0-9]$')
    grams: int | None = Field(default=None,gt=0,le=1000)

class Observation(BaseModel):
    label: Literal['bark','whine','distress','emergency','other']
    confidence: float = Field(ge=0,le=1)

class Grant(BaseModel):
    caregiver_id: str = Field(min_length=1,max_length=128)
    enabled: bool

class Voice(BaseModel):
    recording_id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,100}$')


def build_petcare_router(db, require_account_user):
    r=APIRouter(prefix='/staarhealth/petcare',tags=['petcare'])
    async def owner(user=Depends(require_account_user)):
        uid=user.get('user_id')
        if not uid or user.get('is_demo'): raise HTTPException(403,'account_required')
        return uid
    async def append(uid,kind,data):
        row={'owner_id':uid,'event_id':uuid4().hex,'kind':kind,'data':data,'created_at':utcnow()}
        await db.petcare_events.insert_one(dict(row)); row.pop('owner_id'); return row
    @r.get('/profile')
    async def profile(uid=Depends(owner)):
        row=await db.petcare_profiles.find_one({'_id':uid},{'_id':0})
        return row or {'configured':False}
    @r.put('/profile')
    async def save_profile(body:Profile,uid=Depends(owner)):
        data=body.model_dump(mode='json'); await db.petcare_profiles.update_one({'_id':uid},{'$set':{**data,'configured':True}},upsert=True); return data
    @r.get('/dashboard')
    async def dashboard(uid=Depends(owner)):
        rows={x['device']:x async for x in db.petcare_devices.find({'owner_id':uid})}
        states={d:device_status(rows.get(d)) for d in DEVICES}
        return {'devices':states,'safety':'unknown','atlas':{'monitoring_verified':False},'kaya':{'playback_verified':False},'alerts':[d+'_unavailable' for d,s in states.items() if s!='live'],'actuation_enabled':False}
    @r.post('/journal')
    async def journal(body:Entry,uid=Depends(owner)):
        if body.kind=='weight' and body.weight_kg is None: raise HTTPException(422,'weight_required')
        return await append(uid,body.kind,{**body.model_dump(),'source':'human_reported'})
    @r.get('/journal')
    async def history(limit:int=Query(50,ge=1,le=100),uid=Depends(owner)):
        return [x async for x in db.petcare_events.find({'owner_id':uid},{'_id':0,'owner_id':0}).sort('created_at',-1).limit(limit)]
    @r.post('/schedule')
    async def schedule(body:Schedule,uid=Depends(owner)):
        if body.kind=='feeding' and body.grams is None: raise HTTPException(422,'grams_required')
        return await append(uid,'schedule_requested',{**body.model_dump(),'timezone':'America/Toronto','execution_enabled':False})
    @r.post('/atlas/observation')
    async def observation(body:Observation,uid=Depends(owner)):
        return await append(uid,'atlas_review',{**body.model_dump(),'source':'unverified_input','severity':distress_level(body.label,body.confidence),'notification_delivery':'not_configured'})
    @r.post('/kaya/voice')
    async def voice(body:Voice,uid=Depends(owner)):
        return await append(uid,'voice_requested',{'recording_id':body.recording_id,'playback_enabled':False})
    @r.post('/emergency')
    async def emergency(uid=Depends(owner)):
        return await append(uid,'emergency_requested',{'delivery':'not_configured','instruction':'Contact caregiver or emergency veterinarian directly now.'})
    @r.put('/caregiver')
    async def grant(body:Grant,uid=Depends(owner)):
        if uid==body.caregiver_id: raise HTTPException(422,'distinct_caregiver_required')
        await db.petcare_grants.update_one({'owner_id':uid,'caregiver_id':body.caregiver_id},{'$set':{'enabled':body.enabled,'updated_at':utcnow()}},upsert=True)
        return {'enabled':body.enabled,'remote_access_verified':False}
    @r.get('/caregiver/{owner_id}/dashboard')
    async def caregiver(owner_id:str,uid=Depends(owner)):
        if not await db.petcare_grants.find_one({'owner_id':owner_id,'caregiver_id':uid,'enabled':True}): raise HTTPException(403,'caregiver_not_authorized')
        return {'safety':'unknown','monitoring_verified':False,'instruction':'Physical check required when monitoring unavailable.'}
    from .advanced import register_advanced
    register_advanced(r,db,owner)
    from .device_routes import register_devices
    register_devices(r,db,owner)
    return r
