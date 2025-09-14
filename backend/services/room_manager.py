"""
Room Manager Service
Handles LiveKit room creation, management, and participant tracking
"""

import os
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from livekit import api
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False
    api = None

from models.schemas import RoomInfo, ParticipantInfo

logger = logging.getLogger(__name__)

class RoomManager:
    def __init__(self):
        if not LIVEKIT_AVAILABLE:
            logger.warning("LiveKit not available. RoomManager will run in mock mode.")
            self.livekit_api = None
            self.livekit_url = None
            self.livekit_api_key = None
            self.livekit_api_secret = None
            self.active_rooms: Dict[str, Dict] = {}
            self.room_participants: Dict[str, List[ParticipantInfo]] = {}
            self.conversation_history: Dict[str, List[Dict[str, str]]] = {}
            return
            
        self.livekit_url = os.getenv("LIVEKIT_URL")
        self.livekit_api_key = os.getenv("LIVEKIT_API_KEY")
        self.livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
        
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            logger.warning("LiveKit configuration is incomplete. RoomManager will run in mock mode.")
            self.livekit_api = None
            self.active_rooms: Dict[str, Dict] = {}
            self.room_participants: Dict[str, List[ParticipantInfo]] = {}
            self.conversation_history: Dict[str, List[Dict[str, str]]] = {}
            return
        
        self.livekit_api = None
        self.active_rooms: Dict[str, Dict] = {}
        self.room_participants: Dict[str, List[ParticipantInfo]] = {}
        self.conversation_history: Dict[str, List[Dict[str, str]]] = {}

    def _get_livekit_api(self):
        """Get or create LiveKit API instance"""
        if self.livekit_api is None:
            self.livekit_api = api.LiveKitAPI(
                url=self.livekit_url,
                api_key=self.livekit_api_key,
                api_secret=self.livekit_api_secret
            )
        return self.livekit_api

    async def create_room(self, room_name: str, participant_name: str, is_agent: bool = False) -> RoomInfo:
        """Create a new LiveKit room and generate access token"""
        if not LIVEKIT_AVAILABLE:
            raise RuntimeError("LiveKit is not available. Please install livekit package and configure credentials.")
            
        try:
            livekit_api = self._get_livekit_api()
            
            try:
                await livekit_api.room.create_room(api.CreateRoomRequest(name=room_name))
                logger.info(f"Created room: {room_name}")
            except Exception as e:
                if "already exists" not in str(e).lower():
                    logger.warning(f"Room {room_name} might already exist: {e}")

            token = api.AccessToken(self.livekit_api_key, self.livekit_api_secret)
            token.with_identity(participant_name)
            token.with_name(participant_name)
            
            grants = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True
            )
            
            if is_agent:
                grants.room_admin = True
                grants.can_update_own_metadata = True
            
            token.with_grants(grants)
            jwt_token = token.to_jwt()

            self.active_rooms[room_name] = {
                "created_at": datetime.now(),
                "participants": []
            }
            
            participant_info = ParticipantInfo(
                identity=participant_name,
                name=participant_name,
                is_agent=is_agent,
                joined_at=datetime.now()
            )
            
            if room_name not in self.room_participants:
                self.room_participants[room_name] = []
            self.room_participants[room_name].append(participant_info)

            return RoomInfo(
                room_name=room_name,
                token=jwt_token,
                url=self.livekit_url,
                participant_name=participant_name,
                is_agent=is_agent,
                created_at=datetime.now()
            )

        except Exception as e:
            logger.error(f"Error creating room {room_name}: {e}")
            raise

    async def join_room(self, room_name: str, participant_name: str, is_agent: bool = False) -> RoomInfo:
        """Join an existing LiveKit room"""
        try:
            # Check if room exists
            try:
                room_info = await self.livekit_api.room.list_rooms(api.ListRoomsRequest(names=[room_name]))
                if not room_info.rooms:
                    raise ValueError(f"Room {room_name} does not exist")
            except Exception as e:
                logger.error(f"Error checking room existence: {e}")
                raise

            token = api.AccessToken(self.livekit_api_key, self.livekit_api_secret)
            token.with_identity(participant_name)
            token.with_name(participant_name)
            token.with_grants(api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True
            ))

            if is_agent:
                token.with_grants(api.VideoGrants(
                    room_admin=True,
                    can_update_own_metadata=True
                ))

            jwt_token = token.to_jwt()

            participant_info = ParticipantInfo(
                identity=participant_name,
                name=participant_name,
                is_agent=is_agent,
                joined_at=datetime.now()
            )
            
            if room_name not in self.room_participants:
                self.room_participants[room_name] = []
            self.room_participants[room_name].append(participant_info)

            return RoomInfo(
                room_name=room_name,
                token=jwt_token,
                url=self.livekit_url,
                participant_name=participant_name,
                is_agent=is_agent,
                created_at=datetime.now()
            )

        except Exception as e:
            logger.error(f"Error joining room {room_name}: {e}")
            raise


    def get_room_conversation_history(self, room_name: str) -> List[Dict[str, str]]:
        """Get conversation history for a room"""
        return self.conversation_history.get(room_name, [])
    
    def add_conversation_message(self, room_name: str, speaker: str, message: str):
        """Add a message to the conversation history"""
        if room_name not in self.conversation_history:
            self.conversation_history[room_name] = []
        
        self.conversation_history[room_name].append({
            "speaker": speaker,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
        logger.info(f"Added message to {room_name}: {speaker}: {message[:50]}...")
    
    def clear_conversation_history(self, room_name: str):
        """Clear conversation history for a room"""
        if room_name in self.conversation_history:
            self.conversation_history[room_name] = []
            logger.info(f"Cleared conversation history for room {room_name}")

    async def remove_participant(self, room_name: str, participant_name: str):
        """Remove a participant from a room"""
        try:
            if not LIVEKIT_AVAILABLE:
                logger.info(f"Mock: Removed participant {participant_name} from room {room_name}")
                return
            
            livekit_api = self._get_livekit_api()
            
            await livekit_api.room.remove_participant(
                api.RoomParticipantIdentity(
                    room=room_name,
                    identity=participant_name
                )
            )
            
            if room_name in self.room_participants:
                self.room_participants[room_name] = [
                    p for p in self.room_participants[room_name] 
                    if p.identity != participant_name
                ]
            
            logger.info(f"Removed participant {participant_name} from room {room_name}")
            
        except Exception as e:
            logger.error(f"Error removing participant {participant_name} from room {room_name}: {e}")
            raise

    def _generate_token(self, participant_name: str, room_name: str, is_agent: bool = False) -> str:
        """Generate a LiveKit access token"""
        if not LIVEKIT_AVAILABLE:
            raise RuntimeError("LiveKit is not available. Please install livekit package and configure credentials.")
        
        try:
            token = api.AccessToken(self.livekit_api_key, self.livekit_api_secret)
            token.with_identity(participant_name)
            token.with_name(participant_name)
            
            grants = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True
            )
            
            if is_agent:
                grants.room_admin = True
                grants.can_update_own_metadata = True
            
            token.with_grants(grants)
            return token.to_jwt()
        except Exception as e:
            logger.error(f"Failed to generate token: {e}")
            raise

    def get_available_agents(self) -> List[str]:
        """Get list of available agents based on active agent rooms"""
        try:
            available_agents = []
            
            for room_name, room_info in self.active_rooms.items():
                if room_name.startswith('agent-room-'):
                    agent_name = room_name.replace('agent-room-', '').replace('-', ' ').title()
                    
                    if room_name in self.room_participants:
                        participants = self.room_participants[room_name]
                        if participants:
                            available_agents.append(agent_name)
                    else:
                        available_agents.append(agent_name)
            
            for room_name, participants in self.room_participants.items():
                if room_name.startswith('agent-room-') and participants:
                    agent_name = room_name.replace('agent-room-', '').replace('-', ' ').title()
                    if agent_name not in available_agents:
                        available_agents.append(agent_name)
            
            available_agents = sorted(list(set(available_agents)))
            
            logger.info(f"Available agents: {available_agents}")
            return available_agents
            
        except Exception as e:
            logger.error(f"Error getting available agents: {e}")
            return []

    def get_room_state(self, room_name: str) -> Dict:
        """Get complete room state for persistence"""
        return {
            "room_info": self.active_rooms.get(room_name, {}),
            "participants": [{"name": p.name, "is_agent": p.is_agent, "joined_at": p.joined_at.isoformat()} for p in self.room_participants.get(room_name, [])],
            "conversation_history": self.conversation_history.get(room_name, [])
        }

    def restore_room_state(self, room_name: str, state: Dict):
        """Restore room state from persistence"""
        try:
            if "room_info" in state:
                self.active_rooms[room_name] = state["room_info"]
            
            if "participants" in state:
                from models.schemas import ParticipantInfo
                participants = []
                for p_data in state["participants"]:
                    participant = ParticipantInfo(
                        identity=p_data["name"],
                        name=p_data["name"],
                        is_agent=p_data["is_agent"],
                        joined_at=datetime.fromisoformat(p_data["joined_at"])
                    )
                    participants.append(participant)
                self.room_participants[room_name] = participants
            
            if "conversation_history" in state:
                self.conversation_history[room_name] = state["conversation_history"]
            
            logger.info(f"Restored room state for {room_name}")
        except Exception as e:
            logger.error(f"Error restoring room state for {room_name}: {e}")