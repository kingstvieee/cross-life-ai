from typing import Literal
from fastapi import Depends, HTTPException, Header
from pydantic import BaseModel, Field
from .device_auth import issue_token,valid_token
from .adapters import normalize
from .policy import utcnow

Device=Literal['camera','feeder','climate','audio']
class Telemetry(BaseModel):
    connected: bool=False
    temperature_c: float | None=None
    humidity_pct: float | None=None

def register_devices(r,db,owner):
    @r.post('/devices/{device}/enrol')
    async def enrol(device:Device,uid=Depends(owner)):
        token,hashed=issue_token()
        await db.petcare_devices.update_one({'_id':uid+':'+device},{'$set':{'owner_id':uid,'device':device,'token_digest':hashed,'verified':False,'revoked':False}},upsert=True)
        return {'token':token,'hardware_verified':False}
    @r.delete('/devices/{device}')
    async def revoke(device:Device,uid=Depends(owner)):
        await db.petcare_devices.update_one({'_id':uid+':'+device},{'$set':{'revoked':True,'verified':False},'$unset':{'token_digest':''}})
        return {'revoked':True}
    @r.post('/devices/{device}/telemetry')
    async def telemetry(device:Device,body:Telemetry,uid=Depends(owner),x_device_token:str=Header(...)):
        key={'_id':uid+':'+device,'revoked':False}
        row=await db.petcare_devices.find_one(key)
        if not row or not valid_token(x_device_token,row.get('token_digest')): raise HTTPException(403,'device_not_authorized')
        try: data=normalize(device,body.model_dump())
        except ValueError: raise HTTPException(422,'invalid_telemetry')
        result=await db.petcare_devices.update_one({**key,'token_digest':row['token_digest']},{'$set':{'received_at':utcnow(),'telemetry':data,'connected_reported':body.connected}})
        if not result.matched_count: raise HTTPException(403,'device_revoked')
        return {'accepted':True,'hardware_verified':False,'actuation_enabled':False}
