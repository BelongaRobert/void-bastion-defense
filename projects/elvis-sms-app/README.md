"# elvis-sms-app" 
"# elvis-sms-app" 

ngrok http --url=drum-ultimate-roughly.ngrok-free.app 8000
cd frontend/ && npm run start
cd backend/ && call .\env\Scripts\activate && uvicorn core.asgi:application --host 0.0.0.0 --port 8000 --loop asyncio
cd backend/ && call .\env\Scripts\activate && celery -A core worker -l info --pool=solo


https://sandbox.httpsms.com/