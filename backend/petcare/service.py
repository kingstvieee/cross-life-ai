"""Explicitly enabled supervised worker; never starts on import."""
import asyncio, os
from .runtime import tick
async def main():
    if os.getenv('PETCARE_WORKER_ENABLED')!='true': raise RuntimeError('Pet care worker disabled')
    from motor.motor_asyncio import AsyncIOMotorClient
    client=AsyncIOMotorClient(os.environ['MONGO_URL'])
    try:
        while True:
            await tick(client[os.environ['DB_NAME']]); await asyncio.sleep(10)
    finally: client.close()
if __name__=='__main__': asyncio.run(main())
