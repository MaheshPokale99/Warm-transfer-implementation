"""
Pydantic models for API request/response schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class RoomCreateRequest(BaseModel):
    room_name: str
    participant_name: str
    is_agent: bool = False

class TransferRequest(BaseModel):
    from_room: str
    to_room: str
    from_agent: str
    to_agent: str
    caller_name: str

class TransferCompleteRequest(BaseModel):
    transfer_id: str
    from_room: str
    to_room: str

class SummaryRequest(BaseModel):
    conversation_history: List[Dict[str, str]]
    context: Optional[str] = None

class RoomInfo(BaseModel):
    room_name: str
    token: str
    url: str
    participant_name: str
    is_agent: bool
    created_at: datetime

class TransferInfo(BaseModel):
    transfer_id: str
    from_room: str
    to_room: str
    from_agent: str
    to_agent: str
    caller_name: str
    summary: Optional[str] = None
    status: str 
    created_at: datetime
    caller_token: Optional[str] = None
    destination_room: Optional[str] = None
    transfer_message: Optional[str] = None

class TwilioCallRequest(BaseModel):
    phone_number: str
    room_name: str
    agent_name: str

class ParticipantInfo(BaseModel):
    identity: str
    name: str
    is_agent: bool
    joined_at: datetime

