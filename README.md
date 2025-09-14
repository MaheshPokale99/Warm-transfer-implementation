# Warm Transfer Implementation with LiveKit and LLMs

A complete warm transfer system that enables seamless call handoffs between agents with AI-generated call summaries using LiveKit for real-time communication and OpenAI for intelligent context generation. This implementation fulfills all requirements of the warm transfer assignment.

## 🎯 Assignment Requirements Fulfilled

✅ **Connect caller to Agent A via LiveKit room**  
✅ **Agent A initiates warm transfer to Agent B**  
✅ **AI-generated call summary using LLM**  
✅ **Agent A speaks summary to Agent B using text-to-speech**  
✅ **Agent A exits, leaving Agent B and caller connected**  
✅ **Optional Twilio integration for phone transfers**  
✅ **Interactive Next.js UI for all participants**  
✅ **Complete backend in Python with LiveKit Server SDK**  
✅ **Integration with OpenAI for call summaries and speech generation**

## 🚀 Features

- **Real-time Voice Communication**: Powered by LiveKit for high-quality, low-latency audio
- **AI-Powered Call Summaries**: OpenAI generates intelligent summaries for smooth handoffs
- **Warm Transfer Workflow**: Complete transfer process with context sharing
- **Interactive Web UI**: Modern Next.js interface for agents and callers
- **Optional Twilio Integration**: Support for phone number transfers
- **Real-time Notifications**: Live updates on call status and transfers

## 🏗️ Architecture

### Backend (Python/FastAPI)
- **Room Management**: LiveKit room creation and participant tracking
- **Transfer Service**: Handles warm transfer workflow
- **LLM Service**: OpenAI integration for call summaries
- **Twilio Service**: Optional phone number integration

### Frontend (Next.js/React)
- **Agent Interface**: Complete agent dashboard with transfer controls
- **Caller Interface**: Simple caller interface for joining calls
- **Real-time Updates**: WebSocket connections for live status updates

## 📋 Prerequisites

- Python 3.8+
- Node.js 18+
- LiveKit account and server
- OpenAI API key
- Twilio account (optional)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd warm-transfer-app
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Environment Configuration
```bash
cp env.example .env
```

Edit `.env` with your credentials:
```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# OpenAI Configuration
OPENAI_API_KEY=your-openai-key

# Twilio Configuration (optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Server Configuration
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
DEBUG=True
```

#### Start Backend Server
```bash
python main.py
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Environment Configuration
```bash
cp env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Start Frontend Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔧 Configuration

### LiveKit Setup

1. Sign up for a LiveKit account at [livekit.io](https://livekit.io)
2. Create a new project and get your API credentials
3. Deploy a LiveKit server or use the cloud service
4. Update the `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in your `.env` file

### OpenAI Setup

1. Get an API key from [OpenAI](https://platform.openai.com)
2. Add the key to your `.env` file as `OPENAI_API_KEY`
3. Ensure you have sufficient credits for API usage

### Twilio Setup (Optional)

1. Sign up for a Twilio account
2. Get your Account SID, Auth Token, and Phone Number
3. Add these to your `.env` file for phone transfer functionality

## 🎯 Complete Warm Transfer Workflow

### Step-by-Step Implementation

1. **Setup Phase**
   - Agent A connects to the system via `/agent` interface
   - Caller connects to Agent A's room via `/caller` interface
   - Agent B connects to the system via `/agent-b` interface (ready to receive)

2. **Call Phase**
   - Caller and Agent A communicate in the same LiveKit room
   - Conversation history is tracked automatically
   - Real-time audio communication with LiveKit WebRTC

3. **Transfer Initiation**
   - Agent A clicks "Initiate Agent Transfer"
   - System generates AI summary using OpenAI GPT-3.5-turbo
   - Creates destination room for Agent B
   - Moves caller to Agent B's room

4. **Summary Delivery**
   - Agent A clicks "Play Summary to Agent B"
   - System generates speech using OpenAI TTS
   - Agent A can play the summary audio to Agent B
   - Summary includes caller's issue, key information, and current status

5. **Transfer Completion**
   - Agent A clicks "Complete Transfer"
   - Agent A is removed from the original room
   - Agent B and caller continue in the new room
   - Transfer is marked as completed

### Phone Transfer Flow (Optional)

1. **Agent A initiates phone transfer** by entering a phone number
2. **System dials the number** using Twilio
3. **Agent A explains the summary** to the person who answers
4. **Transfer completes** when Agent A exits the call

## 📱 User Interfaces

### Agent Interface (`/agent`)
- **Connection Controls**: Start/end agent sessions
- **Transfer Controls**: Initiate warm transfers to other agents or phone numbers
- **Participant Management**: View active callers and their status
- **Call History**: Track conversation and transfer history
- **Real-time Notifications**: Live updates on call events

### Caller Interface (`/caller`)
- **Simple Connection**: Easy one-click connection to agents
- **Call Controls**: Mute/unmute and basic call management
- **Participant View**: See connected agents
- **Status Updates**: Real-time connection status

## 🔌 API Endpoints

### Room Management
- `POST /api/rooms/create` - Create a new LiveKit room
- `GET /api/rooms/{room_name}` - Get room information

### Transfer Management
- `POST /api/transfer/initiate` - Initiate a warm transfer
- `POST /api/transfer/complete` - Complete a transfer
- `GET /api/transfer/{transfer_id}` - Get transfer status

### AI Services
- `POST /api/summary/generate` - Generate call summary
- `POST /api/speech/generate` - Generate speech from text

### Twilio Integration (Optional)
- `POST /api/twilio/dial` - Dial a phone number
- `GET /api/twilio/calls` - List active calls

## 🧪 Testing the Complete Warm Transfer Flow

### 1. Start Both Services
```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Test Complete Warm Transfer Flow

#### Step 1: Setup All Participants
1. **Open 3 browser windows/tabs**
2. **Agent A**: Go to `http://localhost:3000` → Enter "Agent A" → Click "Join as Agent A"
3. **Agent B**: Go to `http://localhost:3000` → Enter "Agent B" → Click "Join as Agent B"  
4. **Caller**: Go to `http://localhost:3000` → Enter "John Doe" → Click "Join as Caller"

#### Step 2: Initial Connection
1. **Agent A**: Click "Start Agent Session" → Wait for connection
2. **Caller**: Select "Agent A" from dropdown → Click "Connect to Agent"
3. **Agent B**: Click "Start Agent B Session" → Wait for connection

#### Step 3: Simulate Conversation
1. **Agent A and Caller** are now in the same room
2. **Simulate conversation** by having them speak (if you have microphones)
3. **Conversation history** is automatically tracked

#### Step 4: Initiate Warm Transfer
1. **Agent A**: Enter "Agent B" in transfer field → Click "Initiate Agent Transfer"
2. **System generates AI summary** using OpenAI
3. **Caller is moved** to Agent B's room
4. **Transfer status** shows "Transfer in Progress"

#### Step 5: Deliver Summary
1. **Agent A**: Click "Play Summary to Agent B"
2. **System generates speech** using OpenAI TTS
3. **Audio plays** the transfer summary
4. **Agent B** receives the caller and summary

#### Step 6: Complete Transfer
1. **Agent A**: Click "Complete Transfer"
2. **Agent A exits** the call automatically
3. **Agent B and Caller** continue in the new room
4. **Transfer is completed** successfully

### 3. Test Phone Transfer (Optional)
1. **Agent A**: Select "Phone" transfer type
2. **Enter phone number** (e.g., +1234567890)
3. **Click "Initiate Phone Transfer"**
4. **System dials** using Twilio
5. **Agent A explains** summary to person who answers

## 🎥 Demo Recording

To create a demo recording:

1. **Screen Recording**: Use tools like Loom, OBS, or built-in screen recorders
2. **Demo Script**:
   - Show agent interface connection
   - Demonstrate caller joining
   - Initiate warm transfer with summary generation
   - Show transfer completion
   - Demonstrate phone transfer (if Twilio configured)

## 🔍 Troubleshooting

### Common Issues

1. **LiveKit Connection Failed**
   - Verify LiveKit credentials in `.env`
   - Check if LiveKit server is running
   - Ensure WebSocket URL is correct

2. **OpenAI API Errors**
   - Verify API key is valid
   - Check API credit balance
   - Ensure proper API permissions

3. **Transfer Not Working**
   - Check room names and participant tracking
   - Verify transfer service initialization
   - Review backend logs for errors

4. **Frontend Connection Issues**
   - Verify API URL in `.env.local`
   - Check CORS settings in backend
   - Ensure both services are running

### Debug Mode

Enable debug mode by setting `DEBUG=True` in your `.env` file for detailed logging.

## 📚 Technical Details

### Warm Transfer Workflow

1. **Initiation**: Agent A requests transfer to Agent B
2. **Summary Generation**: OpenAI analyzes conversation history
3. **Room Setup**: System creates or joins destination room
4. **Context Sharing**: Summary is provided to Agent B
5. **Participant Movement**: Caller is moved to new room
6. **Completion**: Agent A exits, transfer is complete

### AI Integration

- **Model**: GPT-3.5-turbo for cost-effective summaries
- **Prompt Engineering**: Optimized for customer service context
- **Fallback**: Simple rule-based summary if AI fails
- **Context Preservation**: Maintains conversation flow

### Security Features

- **Token-based Authentication**: LiveKit JWT tokens
- **Room Isolation**: Secure room access controls
- **API Key Management**: Environment-based configuration
- **CORS Protection**: Configured for production use

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Use secure secret management
2. **HTTPS**: Enable SSL/TLS for all connections
3. **Load Balancing**: Scale backend services as needed
4. **Monitoring**: Implement logging and error tracking
5. **Database**: Consider persistent storage for production

### Docker Deployment (Optional)

```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```
