# redis_clients.py
import redis
import os

redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "127.0.0.1"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

def register_client(phone, channel_name):
    redis_client.set(f"sms:client:{phone}", channel_name)

def get_client(phone):
    return redis_client.get(f"sms:client:{phone}")

def unregister_channel(channel_name):
    for key in redis_client.scan_iter("sms:client:*"):
        if redis_client.get(key) == channel_name:
            redis_client.delete(key)
