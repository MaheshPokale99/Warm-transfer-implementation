"""
Twilio Service
Handles phone number dialing and SIP integration for warm transfers
"""

import os
import logging
from typing import Dict, Optional
from datetime import datetime

try:
    from twilio.rest import Client
    from twilio.twiml.voice_response import VoiceResponse
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    Client = None
    VoiceResponse = None

logger = logging.getLogger(__name__)

class TwilioService:
    def __init__(self):
        if not TWILIO_AVAILABLE:
            logger.warning("Twilio not available. TwilioService will run in mock mode.")
            self.client = None
            self.active_calls: Dict[str, Dict] = {}
            return
            
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        
        if not all([self.account_sid, self.auth_token, self.phone_number]):
            raise ValueError("Twilio configuration is incomplete")
        
        self.client = Client(self.account_sid, self.auth_token)
        self.active_calls: Dict[str, Dict] = {}

    async def dial_and_connect(self, phone_number: str, room_name: str) -> Dict:
        """Dial a phone number and connect to LiveKit room"""
        try:
            # Create TwiML for the call
            twiml_url = f"https://your-domain.com/api/twilio/connect/{room_name}"
            
            # Make the call
            call = self.client.calls.create(
                to=phone_number,
                from_=self.phone_number,
                url=twiml_url,
                method='POST'
            )
            
            # Store call information
            call_info = {
                "call_sid": call.sid,
                "phone_number": phone_number,
                "room_name": room_name,
                "status": call.status,
                "created_at": datetime.now()
            }
            
            self.active_calls[call.sid] = call_info
            
            logger.info(f"Initiated call {call.sid} to {phone_number} for room {room_name}")
            
            return {
                "call_sid": call.sid,
                "status": call.status,
                "phone_number": phone_number,
                "room_name": room_name
            }
            
        except Exception as e:
            logger.error(f"Error dialing phone number {phone_number}: {e}")
            raise

    def generate_connect_twiml(self, room_name: str, summary: Optional[str] = None) -> str:
        """Generate TwiML for connecting to LiveKit room"""
        response = VoiceResponse()
        
        # Add summary if provided
        if summary:
            response.say(f"Warm transfer summary: {summary}")
            response.pause(length=1)
        
        # Connect to LiveKit room
        # Note: This would require LiveKit's Twilio integration
        # For now, we'll use a placeholder
        response.say("Connecting you to the next available agent.")
        response.pause(length=2)
        
        # In a real implementation, you would use LiveKit's Twilio connector
        # response.dial().conference(room_name)
        
        return str(response)

    async def get_call_status(self, call_sid: str) -> Optional[Dict]:
        """Get the status of a specific call"""
        try:
            call = self.client.calls(call_sid).fetch()
            return {
                "call_sid": call.sid,
                "status": call.status,
                "from": call.from_,
                "to": call.to,
                "duration": call.duration,
                "start_time": call.start_time,
                "end_time": call.end_time
            }
        except Exception as e:
            logger.error(f"Error getting call status for {call_sid}: {e}")
            return None

    async def hangup_call(self, call_sid: str) -> bool:
        """Hang up a specific call"""
        try:
            call = self.client.calls(call_sid).update(status='completed')
            logger.info(f"Hung up call {call_sid}")
            return True
        except Exception as e:
            logger.error(f"Error hanging up call {call_sid}: {e}")
            return False

    async def list_active_calls(self) -> Dict[str, Dict]:
        """List all active calls"""
        try:
            calls = self.client.calls.list(status='in-progress')
            active_calls = {}
            
            for call in calls:
                active_calls[call.sid] = {
                    "call_sid": call.sid,
                    "from": call.from_,
                    "to": call.to,
                    "status": call.status,
                    "start_time": call.start_time
                }
            
            return active_calls
            
        except Exception as e:
            logger.error(f"Error listing active calls: {e}")
            return {}

    async def create_conference_room(self, room_name: str) -> str:
        """Create a Twilio conference room"""
        try:
            # In a real implementation, this would create a conference room
            # that can be connected to LiveKit
            conference_name = f"livekit_{room_name}"
            
            logger.info(f"Created conference room: {conference_name}")
            return conference_name
            
        except Exception as e:
            logger.error(f"Error creating conference room: {e}")
            raise

    async def transfer_to_phone(self, call_sid: str, phone_number: str) -> bool:
        """Transfer an existing call to another phone number"""
        try:
            # Create TwiML for transfer
            response = VoiceResponse()
            response.say("Please hold while I transfer you to a specialist.")
            response.dial(phone_number)
            
            # Update the call with new TwiML
            call = self.client.calls(call_sid).update(
                twiml=str(response)
            )
            
            logger.info(f"Transferred call {call_sid} to {phone_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error transferring call {call_sid} to {phone_number}: {e}")
            return False

    async def send_sms_notification(self, phone_number: str, message: str) -> bool:
        """Send SMS notification about the transfer"""
        try:
            message_obj = self.client.messages.create(
                body=message,
                from_=self.phone_number,
                to=phone_number
            )
            
            logger.info(f"Sent SMS to {phone_number}: {message_obj.sid}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending SMS to {phone_number}: {e}")
            return False

    async def get_phone_number_info(self, phone_number: str) -> Dict:
        """Get information about a phone number"""
        try:
            # This would use Twilio's Lookup API
            # For now, return basic info
            return {
                "phone_number": phone_number,
                "country_code": "US",  # Placeholder
                "carrier": "Unknown",  # Placeholder
                "line_type": "mobile"  # Placeholder
            }
        except Exception as e:
            logger.error(f"Error getting phone number info for {phone_number}: {e}")
            return {}

    async def cleanup_old_calls(self):
        """Clean up old call records"""
        current_time = datetime.now()
        calls_to_remove = []
        
        for call_sid, call_info in self.active_calls.items():
            time_diff = current_time - call_info["created_at"]
            if time_diff.total_seconds() > 3600:  # 1 hour
                calls_to_remove.append(call_sid)
        
        for call_sid in calls_to_remove:
            del self.active_calls[call_sid]
            logger.info(f"Cleaned up old call record: {call_sid}")

    def generate_webhook_twiml(self, action: str, **kwargs) -> str:
        """Generate TwiML for webhook responses"""
        response = VoiceResponse()
        
        if action == "connect_to_room":
            room_name = kwargs.get("room_name")
            summary = kwargs.get("summary")
            
            if summary:
                response.say(f"Transfer summary: {summary}")
                response.pause(length=1)
            
            response.say("Connecting you to the agent.")
            # In real implementation: response.dial().conference(room_name)
            
        elif action == "hold_music":
            response.play("https://demo.twilio.com/docs/classic.mp3")
            
        elif action == "transfer_message":
            message = kwargs.get("message", "Please hold while I transfer you.")
            response.say(message)
            
        return str(response)
