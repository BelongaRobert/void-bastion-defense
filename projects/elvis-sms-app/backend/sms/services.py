from twilio.rest import Client
import asyncio
import os

client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

async def send_twilio_message(to, body, from_number=None):
    """Send SMS via Twilio with status callback"""
    server_url = os.getenv('SERVER_URL')
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")
    if from_number:
        twilio_phone = from_number 

    
    if not server_url:
        raise ValueError("SERVER_URL environment variable not set")
    if not twilio_phone:
        raise ValueError("TWILIO_PHONE_NUMBER environment variable not set")
    
    # Make sure server_url doesn't have trailing slash
    server_url = server_url.rstrip('/')
    status_callback = f"{server_url}/webhook/status"
    
    
    loop = asyncio.get_event_loop()
    
    # Create message WITHOUT status_callback_method parameter
    message = await loop.run_in_executor(
        None,
        lambda: client.messages.create(
            to=to,
            from_=twilio_phone,
            body=body,
            status_callback=status_callback,  # Only this parameter
            # status_callback_method="POST"  # REMOVE THIS LINE
        )
    )

    print(f"Message sent with SID: {message.sid}, Status: {message.status}")
    
    return {
        "sid": message.sid,
        "status": message.status,
        "dateCreated": message.date_created
    }