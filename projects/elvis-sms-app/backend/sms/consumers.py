import json
from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime
from core.redis_clients import register_client, unregister_channel
# Global dictionary to track phone -> channel_name mappings

class SMSConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.client_id = self.channel_name

        await self.send(json.dumps({
            "type": "connected",
            "clientId": self.client_id,
            "timestamp": datetime.utcnow().isoformat()
        }))

    async def disconnect(self, close_code):
        unregister_channel(self.channel_name)


    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")
        print('msg_type', data)

        if msg_type == "register":
            register_client(data["phone"], self.channel_name)
            await self.send(json.dumps({
                "type": "registered",
                "clientId": self.channel_name,
                "timestamp": datetime.utcnow().isoformat()
            }))


        elif msg_type == "send":
            from .services import send_twilio_message
            result = await send_twilio_message(
                data["to"],
                data["body"],
            )

            await self.send(json.dumps({
                "type": "sent",
                "messageId": data.get("messageId"),
                "to": data["to"],
                "body": data["body"],
                "twilioSid": result["sid"],
                "status": result["status"],
                "timestamp": datetime.utcnow().isoformat()
            }))
   
    async def ws_send(self, event):
        """Handler for sending messages from external sources"""
        await self.send(text_data=json.dumps(event["message"]))