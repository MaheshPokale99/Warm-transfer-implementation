"""
Transfer Service
Handles the warm transfer workflow between agents
"""

import logging
import uuid
from typing import Dict, Optional
from datetime import datetime

from models.schemas import TransferInfo
from services.room_manager import RoomManager
from services.llm_service import LLMService

logger = logging.getLogger(__name__)

class TransferService:
    def __init__(self, room_manager: RoomManager, llm_service: LLMService):
        self.room_manager = room_manager
        self.llm_service = llm_service
        self.active_transfers: Dict[str, TransferInfo] = {}

    async def initiate_transfer(
        self,
        from_room: str,
        to_room: str,
        from_agent: str,
        to_agent: str,
        caller_name: str
    ) -> TransferInfo:
        """Initiate a warm transfer between two agents"""
        try:
            # Generate unique transfer ID
            transfer_id = str(uuid.uuid4())
            
            # Get conversation history from the source room
            conversation_history = self.room_manager.get_room_conversation_history(from_room)
            
            # Generate call summary using LLM
            summary = await self.llm_service.generate_call_summary(
                conversation_history=conversation_history,
                context=f"Transfer from {from_agent} to {to_agent}"
            )
            
            # Create transfer info
            transfer_info = TransferInfo(
                transfer_id=transfer_id,
                from_room=from_room,
                to_room=to_room,
                from_agent=from_agent,
                to_agent=to_agent,
                caller_name=caller_name,
                summary=summary,
                status="initiated",
                created_at=datetime.now()
            )
            
            # Store transfer info
            self.active_transfers[transfer_id] = transfer_info
            
            # Create or join the destination room for Agent B
            await self._setup_destination_room(to_room, to_agent)
            
            # Move caller to the destination room
            await self._move_caller_to_destination_room(from_room, to_room, caller_name)
            
            # Generate transfer message for Agent A to speak to Agent B
            transfer_message = await self.llm_service.generate_transfer_message(summary, to_agent)
            
            logger.info(f"Transfer {transfer_id} initiated from {from_room} to {to_room}")
            
            # Update status to in_progress
            transfer_info.status = "in_progress"
            
            return transfer_info
            
        except Exception as e:
            logger.error(f"Error initiating transfer: {e}")
            raise

    async def _setup_destination_room(self, room_name: str, agent_name: str):
        """Set up the destination room for the transfer"""
        try:
            # For warm transfer, Agent B should join the SAME room as the caller
            # The caller will be moved to this room, and Agent B will join them
            try:
                # Try to join existing room first
                room_info = await self.room_manager.join_room(room_name, agent_name, is_agent=True)
            except:
                # Room doesn't exist, create it
                room_info = await self.room_manager.create_room(room_name, agent_name, is_agent=True)
            
            logger.info(f"Destination room {room_name} set up for agent {agent_name}")
            return room_info
            
        except Exception as e:
            logger.error(f"Error setting up destination room {room_name}: {e}")
            raise

    async def _move_caller_to_destination_room(self, from_room: str, to_room: str, caller_name: str):
        """Move the caller from source room to destination room"""
        try:
            # Remove caller from source room
            await self.room_manager.remove_participant(from_room, caller_name)
            
            # Add caller to destination room
            await self.room_manager.join_room(to_room, caller_name, is_agent=False)
            
            # Copy conversation history to destination room
            conversation_history = self.room_manager.get_room_conversation_history(from_room)
            for message in conversation_history:
                self.room_manager.add_conversation_message(to_room, message["speaker"], message["message"])
            
            logger.info(f"Moved caller {caller_name} from {from_room} to {to_room}")
            
        except Exception as e:
            logger.error(f"Error moving caller {caller_name} from {from_room} to {to_room}: {e}")
            raise

    async def complete_transfer(
        self,
        transfer_id: str,
        from_room: str,
        to_room: str
    ) -> Dict:
        """Complete the warm transfer process"""
        try:
            if transfer_id not in self.active_transfers:
                raise ValueError(f"Transfer {transfer_id} not found")
            
            transfer_info = self.active_transfers[transfer_id]
            
            # Verify transfer details
            if transfer_info.from_room != from_room or transfer_info.to_room != to_room:
                raise ValueError("Transfer room mismatch")
            
            # Remove Agent A from the original room
            await self.room_manager.remove_participant(from_room, transfer_info.from_agent)
            
            # Update transfer status
            transfer_info.status = "completed"
            
            logger.info(f"Transfer {transfer_id} completed successfully")
            
            return {
                "transfer_id": transfer_id,
                "status": "completed",
                "from_room": from_room,
                "to_room": to_room,
                "completed_at": datetime.now().isoformat(),
                "summary": transfer_info.summary
            }
            
        except Exception as e:
            logger.error(f"Error completing transfer {transfer_id}: {e}")
            # Mark transfer as failed
            if transfer_id in self.active_transfers:
                self.active_transfers[transfer_id].status = "failed"
            raise

    async def get_transfer_status(self, transfer_id: str) -> Optional[TransferInfo]:
        """Get the status of a specific transfer"""
        return self.active_transfers.get(transfer_id)

    async def list_active_transfers(self) -> Dict[str, TransferInfo]:
        """List all active transfers"""
        return {
            tid: info for tid, info in self.active_transfers.items()
            if info.status in ["initiated", "in_progress"]
        }

    async def cancel_transfer(self, transfer_id: str) -> Dict:
        """Cancel an active transfer"""
        try:
            if transfer_id not in self.active_transfers:
                raise ValueError(f"Transfer {transfer_id} not found")
            
            transfer_info = self.active_transfers[transfer_id]
            
            if transfer_info.status not in ["initiated", "in_progress"]:
                raise ValueError(f"Cannot cancel transfer in status: {transfer_info.status}")
            
            # Update status
            transfer_info.status = "cancelled"
            
            logger.info(f"Transfer {transfer_id} cancelled")
            
            return {
                "transfer_id": transfer_id,
                "status": "cancelled",
                "cancelled_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error cancelling transfer {transfer_id}: {e}")
            raise

    async def get_transfer_summary(self, transfer_id: str) -> Optional[str]:
        """Get the summary for a specific transfer"""
        transfer_info = self.active_transfers.get(transfer_id)
        return transfer_info.summary if transfer_info else None

    async def update_transfer_progress(self, transfer_id: str, progress: str):
        """Update the progress of a transfer"""
        if transfer_id in self.active_transfers:
            self.active_transfers[transfer_id].status = progress
            logger.info(f"Transfer {transfer_id} progress updated to: {progress}")

    async def cleanup_completed_transfers(self):
        """Clean up completed transfers older than 1 hour"""
        current_time = datetime.now()
        transfers_to_remove = []
        
        for transfer_id, transfer_info in self.active_transfers.items():
            if transfer_info.status in ["completed", "failed", "cancelled"]:
                time_diff = current_time - transfer_info.created_at
                if time_diff.total_seconds() > 3600:  # 1 hour
                    transfers_to_remove.append(transfer_id)
        
        for transfer_id in transfers_to_remove:
            del self.active_transfers[transfer_id]
            logger.info(f"Cleaned up old transfer: {transfer_id}")

    async def get_transfer_statistics(self) -> Dict:
        """Get statistics about transfers"""
        total_transfers = len(self.active_transfers)
        active_transfers = len([t for t in self.active_transfers.values() if t.status in ["initiated", "in_progress"]])
        completed_transfers = len([t for t in self.active_transfers.values() if t.status == "completed"])
        failed_transfers = len([t for t in self.active_transfers.values() if t.status == "failed"])
        
        return {
            "total_transfers": total_transfers,
            "active_transfers": active_transfers,
            "completed_transfers": completed_transfers,
            "failed_transfers": failed_transfers,
            "success_rate": (completed_transfers / total_transfers * 100) if total_transfers > 0 else 0
        }
