"""
LLM Service
Handles call summary generation using OpenAI
"""

import os
import logging
import base64
from typing import List, Dict, Optional
from datetime import datetime

import openai

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.openai_client = None
        
        # Initialize OpenAI client
        if os.getenv("OPENAI_API_KEY"):
            self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            logger.info("OpenAI client initialized")
        else:
            logger.warning("OpenAI API key not found. LLM features will be disabled.")

    async def generate_call_summary(
        self, 
        conversation_history: List[Dict[str, str]], 
        context: Optional[str] = None
    ) -> str:
        """Generate a call summary using OpenAI"""
        
        if not self.openai_client:
            logger.warning("OpenAI client not available, using fallback summary")
            return self._generate_fallback_summary(conversation_history)
        
        # Format conversation history
        formatted_conversation = self._format_conversation(conversation_history)
        
        # Create the prompt
        prompt = self._create_summary_prompt(formatted_conversation, context)
        
        try:
            summary = await self._generate_with_openai(prompt)
            logger.info("Generated summary using OpenAI")
            return summary
        except Exception as e:
            logger.warning(f"Failed to generate summary with OpenAI: {e}")
            return self._generate_fallback_summary(conversation_history)

    def _format_conversation(self, conversation_history: List[Dict[str, str]]) -> str:
        """Format conversation history for LLM processing"""
        formatted = []
        for entry in conversation_history:
            speaker = entry.get("speaker", "Unknown")
            message = entry.get("message", "")
            timestamp = entry.get("timestamp", "")
            formatted.append(f"[{timestamp}] {speaker}: {message}")
        return "\n".join(formatted)

    def _create_summary_prompt(self, conversation: str, context: Optional[str] = None) -> str:
        """Create a prompt for call summary generation"""
        base_prompt = f"""
You are an AI assistant that creates concise call summaries for warm transfers between customer service agents. 

Please analyze the following conversation and create a professional summary that includes:
1. The caller's main issue or request
2. Key information discussed
3. Current status/resolution progress
4. Any important details the receiving agent should know

Conversation:
{conversation}

"""
        
        if context:
            base_prompt += f"\nAdditional Context: {context}\n"
        
        base_prompt += """
Please provide a clear, concise summary (2-3 sentences) that will help the receiving agent understand the situation and continue the conversation effectively.
"""
        
        return base_prompt

    async def _generate_with_openai(self, prompt: str) -> str:
        """Generate summary using OpenAI"""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
        
        response = self.openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates concise call summaries for customer service transfers."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()


    def _generate_fallback_summary(self, conversation_history: List[Dict[str, str]]) -> str:
        """Generate a simple fallback summary if all LLM providers fail"""
        if not conversation_history:
            return "No conversation history available."
        
        # Extract key information from conversation
        caller_messages = [msg for msg in conversation_history if msg.get("speaker", "").lower() != "agent"]
        agent_messages = [msg for msg in conversation_history if msg.get("speaker", "").lower() == "agent"]
        
        summary_parts = []
        
        if caller_messages:
            first_caller_msg = caller_messages[0].get("message", "")
            summary_parts.append(f"Caller's main concern: {first_caller_msg[:100]}...")
        
        if agent_messages:
            last_agent_msg = agent_messages[-1].get("message", "")
            summary_parts.append(f"Agent's last response: {last_agent_msg[:100]}...")
        
        summary_parts.append(f"Total messages exchanged: {len(conversation_history)}")
        
        return " | ".join(summary_parts)

    async def generate_transfer_message(self, summary: str, to_agent: str) -> str:
        """Generate a message for the warm transfer"""
        return f"""
Warm Transfer Summary for {to_agent}:

{summary}

Please continue assisting the caller with this information. The previous agent has provided this context to ensure a smooth handoff.
"""

    async def generate_speech(self, text: str, voice: str = "alloy") -> str:
        """Generate speech audio from text using OpenAI TTS"""
        try:
            if not self.openai_client:
                logger.warning("OpenAI client not available for speech generation")
                return None
            
            response = self.openai_client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text
            )
            
            # Convert audio to base64 for transmission
            audio_data = response.content
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            logger.info(f"Generated speech for text: {text[:50]}...")
            return audio_base64
            
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return None

    async def analyze_sentiment(self, conversation_history: List[Dict[str, str]]) -> str:
        """Analyze the sentiment of the conversation"""
        if not conversation_history:
            return "neutral"
        
        # Simple sentiment analysis based on keywords
        positive_keywords = ["thank", "great", "excellent", "happy", "satisfied", "good", "perfect"]
        negative_keywords = ["angry", "frustrated", "disappointed", "terrible", "awful", "bad", "problem"]
        
        all_text = " ".join([msg.get("message", "").lower() for msg in conversation_history])
        
        positive_count = sum(1 for word in positive_keywords if word in all_text)
        negative_count = sum(1 for word in negative_keywords if word in all_text)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"

    async def extract_key_points(self, conversation_history: List[Dict[str, str]]) -> List[str]:
        """Extract key points from the conversation"""
        key_points = []
        
        for msg in conversation_history:
            message = msg.get("message", "")
            speaker = msg.get("speaker", "")
            
            # Look for important information
            if any(keyword in message.lower() for keyword in ["account", "order", "payment", "refund", "issue", "problem"]):
                key_points.append(f"{speaker}: {message[:100]}...")
        
        return key_points[:5]  # Limit to 5 key points
