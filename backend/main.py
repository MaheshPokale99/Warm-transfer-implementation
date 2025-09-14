"""
Warm Transfer Backend Server
Main FastAPI application for handling LiveKit room management and warm transfers
"""

import os
import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

try:
    from livekit import api
    LIVEKIT_AVAILABLE = True
    print("LiveKit API loaded successfully")
except ImportError:
    LIVEKIT_AVAILABLE = False
    print("Warning: LiveKit not available. Some features will be disabled.")

from services.room_manager import RoomManager
from services.llm_service import LLMService
from services.transfer_service import TransferService
from services.twilio_service import TwilioService
from models.schemas import (
    RoomCreateRequest, TransferRequest, 
    TransferCompleteRequest, SummaryRequest, RoomInfo, TransferInfo,
    TwilioCallRequest
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Warm Transfer API",
    description="API for managing LiveKit rooms and warm transfers",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
try:
    room_manager = RoomManager()
    logger.info("Room manager initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize room manager: {e}")
    room_manager = None

transfer_service = TransferService(room_manager, None) if room_manager else None

try:
    llm_service = LLMService()
    logger.info("LLM service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize LLM service: {e}")
    llm_service = None

if transfer_service and llm_service:
    transfer_service.llm_service = llm_service

try:
    twilio_service = TwilioService() if os.getenv("TWILIO_ACCOUNT_SID") else None
    if twilio_service:
        logger.info("Twilio service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Twilio service: {e}")
    twilio_service = None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()


@app.post("/api/token/generate")
async def generate_token(request: RoomCreateRequest):
    """Generate LiveKit access token"""
    if not room_manager:
        raise HTTPException(status_code=501, detail="Room manager not available")
    
    try:
        room_info = await room_manager.create_room(
            room_name=request.room_name,
            participant_name=request.participant_name,
            is_agent=request.is_agent
        )
        return {"token": room_info.token, "room_name": room_info.room_name}
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rooms/create", response_model=RoomInfo)
async def create_room(request: RoomCreateRequest):
    """Create a new LiveKit room"""
    if not room_manager:
        raise HTTPException(status_code=501, detail="Room manager not available")
    
    try:
        room_info = await room_manager.create_room(
            room_name=request.room_name,
            participant_name=request.participant_name,
            is_agent=request.is_agent
        )
        return room_info
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transfer/initiate", response_model=TransferInfo)
async def initiate_transfer(request: TransferRequest):
    """Initiate a warm transfer between agents"""
    try:
        transfer_info = await transfer_service.initiate_transfer(
            from_room=request.from_room,
            to_room=request.to_room,
            from_agent=request.from_agent,
            to_agent=request.to_agent,
            caller_name=request.caller_name
        )
        return transfer_info
    except Exception as e:
        logger.error(f"Error initiating transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/transfer/complete")
async def complete_transfer(request: TransferCompleteRequest):
    """Complete the warm transfer process"""
    try:
        result = await transfer_service.complete_transfer(
            transfer_id=request.transfer_id,
            from_room=request.from_room,
            to_room=request.to_room
        )
        return result
    except Exception as e:
        logger.error(f"Error completing transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/summary/generate")
async def generate_summary(request: SummaryRequest):
    """Generate call summary using LLM"""
    try:
        summary = await llm_service.generate_call_summary(
            conversation_history=request.conversation_history,
            context=request.context
        )
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/speech/generate")
async def generate_speech(request: dict):
    """Generate speech audio from text"""
    try:
        text = request.get("text")
        voice = request.get("voice", "alloy")
        
        if not text:
            raise HTTPException(status_code=400, detail="text is required")
        
        audio_base64 = await llm_service.generate_speech(text, voice)
        
        if audio_base64:
            return {"audio": audio_base64, "status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate speech")
            
    except Exception as e:
        logger.error(f"Error generating speech: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/agents/available")
async def get_available_agents():
    """Get list of available agents"""
    try:
        if not room_manager:
            raise HTTPException(status_code=501, detail="Room manager not available")
        
        available_agents = room_manager.get_available_agents()
        return {"agents": available_agents}
    except Exception as e:
        logger.error(f"Error getting available agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transfer/debug/{transfer_id}")
async def debug_transfer(transfer_id: str):
    """Debug transfer status and details"""
    try:
        if not transfer_service:
            raise HTTPException(status_code=501, detail="Transfer service not available")
        
        transfer_info = await transfer_service.get_transfer_status(transfer_id)
        if not transfer_info:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        # Get room participants for both rooms
        from_participants = room_manager.room_participants.get(transfer_info.from_room, [])
        to_participants = room_manager.room_participants.get(transfer_info.to_room, [])
        
        return {
            "transfer": transfer_info,
            "from_room_participants": [{"name": p.name, "is_agent": p.is_agent} for p in from_participants],
            "to_room_participants": [{"name": p.name, "is_agent": p.is_agent} for p in to_participants],
            "conversation_history": room_manager.get_room_conversation_history(transfer_info.from_room)
        }
    except Exception as e:
        logger.error(f"Error debugging transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{room_name}")
async def websocket_endpoint(websocket: WebSocket, room_name: str):
    """WebSocket endpoint for real-time room updates"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle real-time updates
            await manager.broadcast(f"Room {room_name}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "Warm Transfer API", 
        "version": "1.0.0",
        "services": {
            "room_manager": room_manager is not None,
            "llm_service": llm_service is not None,
            "transfer_service": transfer_service is not None,
            "twilio_service": twilio_service is not None
        }
    }

@app.get("/api/health")
async def detailed_health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "room_manager": {
                "available": room_manager is not None,
                "livekit_available": LIVEKIT_AVAILABLE,
                "livekit_configured": bool(os.getenv("LIVEKIT_URL") and os.getenv("LIVEKIT_API_KEY") and os.getenv("LIVEKIT_API_SECRET"))
            },
            "llm_service": {
                "available": llm_service is not None,
                "openai_configured": bool(os.getenv("OPENAI_API_KEY"))
            },
            "transfer_service": {
                "available": transfer_service is not None
            },
            "twilio_service": {
                "available": twilio_service is not None,
                "configured": bool(os.getenv("TWILIO_ACCOUNT_SID"))
            }
        }
    }


# Twilio integration endpoints (optional)
@app.post("/api/twilio/dial")
async def dial_phone_number(request: TwilioCallRequest):
    """Dial a phone number and connect to LiveKit room"""
    if not twilio_service:
        raise HTTPException(status_code=501, detail="Twilio service not configured")
    
    try:
        result = await twilio_service.dial_and_connect(request.phone_number, request.room_name)
        return result
    except Exception as e:
        logger.error(f"Error dialing phone number: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
