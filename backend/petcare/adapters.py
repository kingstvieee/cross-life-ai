"""Read-only normalized adapter boundary; no unverified actuator calls."""
from .policy import DEVICES

def normalize(device, payload):
    if device not in DEVICES: raise ValueError('unknown_device')
    if device=='climate':
        t,h=payload.get('temperature_c'),payload.get('humidity_pct')
        if type(t) not in (int,float) or type(h) not in (int,float) or not -40<=t<=85 or not 0<=h<=100: raise ValueError('invalid_climate')
        return {'temperature_c':t,'humidity_pct':h}
    return {'connection_reported':payload.get('connected') is True}
