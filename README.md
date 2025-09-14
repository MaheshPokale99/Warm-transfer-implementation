# Warm Transfer Application with LiveKit and OpenAI

A comprehensive warm transfer system that enables seamless call handoffs between agents with AI-generated call summaries using LiveKit for real-time communication and OpenAI for intelligent context generation.

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

## 🎯 Usage

### Basic Warm Transfer Flow

1. **Agent A connects** to the system via the agent interface
2. **Caller joins** the same room as Agent A
3. **Agent A initiates transfer** by specifying Agent B's name
4. **System generates summary** using OpenAI based on conversation history
5. **Agent B joins** the room and receives the call summary
6. **Agent A completes transfer** and exits the room
7. **Caller continues** with Agent B seamlessly

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

## 🧪 Testing the Application

### 1. Start Both Services
```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Test Basic Flow
1. Open two browser windows
2. Go to `http://localhost:3000/agent?name=AgentA` in one window
3. Go to `http://localhost:3000/caller?name=Caller` in another window
4. Connect both to their respective rooms
5. Test the warm transfer functionality

### 3. Test Transfer Flow
1. Agent A connects and waits for caller
2. Caller connects to Agent A's room
3. Agent A initiates transfer to "AgentB"
4. System generates summary and creates transfer room
5. Agent A completes transfer and exits
6. Caller continues with Agent B

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
