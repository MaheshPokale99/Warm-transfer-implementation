'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Phone, Users, ArrowRight, MessageSquare
} from 'lucide-react'
import { Room, RoomEvent, RemoteParticipant, Track } from 'livekit-client'
import axios from 'axios'
import MainButton from '../../components/ui/MainButton'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})
import InputField from '../../components/ui/InputField'
import IOKnob from '../../components/ui/IOKnob'
import StatusCard from '../../components/ui/StatusCard'
import NotificationPanel from '../../components/ui/NotificationPanel'
import ParticipantCard from '../../components/ui/ParticipantCard'
import { useNotification } from '../../components/ui/NotificationProvider'

interface TransferInfo {
  transfer_id: string
  from_room: string
  to_room: string
  from_agent: string
  to_agent: string
  caller_name: string
  summary?: string
  status: string
  created_at: string
}

function AgentPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const participantName = searchParams.get('name') || 'Agent'
  const { success, error, warning } = useNotification()

  const [room, setRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const [activeTransfer, setActiveTransfer] = useState<TransferInfo | null>(null)
  const [transferToAgent, setTransferToAgent] = useState('')
  const [transferToPhone, setTransferToPhone] = useState('')
  const [transferType, setTransferType] = useState<'agent' | 'phone'>('agent')
  const [isTransferring, setIsTransferring] = useState(false)
  const [availableAgents, setAvailableAgents] = useState<string[]>([])

  const [showAgentSuggestions, setShowAgentSuggestions] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ speaker: string, message: string, timestamp: string }>>([])
  const [currentRoomName, setCurrentRoomName] = useState<string>('')
  const [isPlayingSummary, setIsPlayingSummary] = useState(false)
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'transfer' as const,
      title: 'Transfer Request',
      message: 'New warm transfer request from Agent A',
      timestamp: '2 min ago',
      unread: true
    },
    {
      id: '2',
      type: 'call' as const,
      title: 'Call Connected',
      message: 'Caller John Doe has joined the room',
      timestamp: '5 min ago',
      unread: false
    }
  ])

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect()
      }
      if (wsConnection) {
        wsConnection.close()
      }
    }
  }, [room, wsConnection])

  const fetchAvailableAgents = async () => {
    try {
      const response = await api.get('/api/agents/available')
      if (response.data && response.data.agents) {
        setAvailableAgents(response.data.agents)
      } else {
        setAvailableAgents([])
      }
    } catch (_err) {
      setAvailableAgents([])
    }
  }

  useEffect(() => {
    fetchAvailableAgents()
  }, [])

  useEffect(() => {
    if (!isConnected) return
    const id = setInterval(() => {
      fetchAvailableAgents()
    }, 4000)
    return () => clearInterval(id)
  }, [isConnected])

  useEffect(() => {
    if (showAgentSuggestions) {
      fetchAvailableAgents()
    }
  }, [showAgentSuggestions])

  const filteredAgents = availableAgents.filter(agent =>
    transferToAgent.length === 0 || agent.toLowerCase().includes(transferToAgent.toLowerCase())
  )

  const handleAgentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    setTransferToAgent(value)
    setShowAgentSuggestions(true)
  }

  const handleAgentInputFocus = () => {
    setShowAgentSuggestions(true)
  }

  const selectAgent = (agentName: string) => {
    setTransferToAgent(agentName)
    setShowAgentSuggestions(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.agent-suggestions-container')) {
        setShowAgentSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const connectToRoom = async () => {
    try {
      setIsConnecting(true)

      const roomName = `agent-room-${participantName.toLowerCase().replace(/\s+/g, '-')}`

      const response = await api.post('/api/token/generate', {
        room_name: roomName,
        participant_name: participantName,
        is_agent: true
      })

      const roomData = response.data
      const token = roomData.token

      // Connect to LiveKit room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: {
            maxBitrate: 16000,
            priority: 'high'
          }
        }
      })

      newRoom.on(RoomEvent.Connected, () => {
        setIsConnected(true)
        setIsConnecting(false)
        success('Connected', 'Successfully connected to agent room')

        const existingParticipants = Array.from(newRoom.remoteParticipants.values())
        setParticipants(existingParticipants)

        existingParticipants.forEach(participant => {
          setNotifications(prev => [...prev, {
            id: `existing-${participant.identity}`,
            type: 'call' as const,
            title: 'Participant Already Connected',
            message: `${participant.name || participant.identity} is already in the call`,
            timestamp: 'Just now',
            unread: true
          }])
        })

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/${roomName}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'TEST_CONNECTION', message: 'Agent A connected' }))
        }

        ws.onmessage = (event) => {
          const message = event.data
        }

        ws.onclose = () => {
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }

        setWsConnection(ws)
      })

      newRoom.on(RoomEvent.Disconnected, () => {
        setIsConnected(false)
        setIsConnecting(false)
      })

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        setParticipants(prev => [...prev, participant])

        setNotifications(prev => [...prev, {
          id: `caller-${Date.now()}`,
          type: 'call' as const,
          title: 'Caller Connected',
          message: `${participant.name || participant.identity} has joined the call`,
          timestamp: 'Just now',
          unread: true
        }])

        setConversationHistory(prev => [...prev, {
          speaker: participant.name || participant.identity,
          message: 'joined the call',
          timestamp: new Date().toISOString()
        }])
      })

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity))

        setNotifications(prev => [...prev, {
          id: `caller-left-${Date.now()}`,
          type: 'call' as const,
          title: 'Caller Disconnected',
          message: `${participant.name || participant.identity} has left the call`,
          timestamp: 'Just now',
          unread: true
        }])

        setConversationHistory(prev => [...prev, {
          speaker: participant.name || participant.identity,
          message: 'left the call',
          timestamp: new Date().toISOString()
        }])
      })

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach()
          audioElement.play()
        }
      })

      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        track.detach()
      })

      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured. Please set NEXT_PUBLIC_LIVEKIT_URL in your environment variables.')
      }

      await newRoom.connect(livekitUrl, token)
      setRoom(newRoom)
      setCurrentRoomName(roomName)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room'
      error('Connection Failed', errorMessage)
      setIsConnecting(false)
    }
  }

  const disconnectFromRoom = async () => {
    if (room) {
      await room.disconnect()
      setRoom(null)
      setIsConnected(false)
      setParticipants([])
      setActiveTransfer(null)
      setCurrentRoomName('')
    }
  }

  const toggleMute = async () => {
    if (room) {
      if (isMuted) {
        await room.localParticipant.setMicrophoneEnabled(true)
      } else {
        await room.localParticipant.setMicrophoneEnabled(false)
      }
      setIsMuted(!isMuted)
    }
  }

  const toggleDeafen = async () => {
    if (room) {
      if (isDeafened) {
        await room.startAudio()
      }
      setIsDeafened(!isDeafened)
    }
  }

  const initiateTransfer = async () => {
    if (transferType === 'agent' && !transferToAgent.trim()) {
      warning('Invalid Input', 'Please enter the agent name to transfer to')
      return
    }

    if (transferType === 'phone' && !transferToPhone.trim()) {
      warning('Invalid Input', 'Please enter the phone number to transfer to')
      return
    }

    if (!room) {
      warning('No Room', 'No active room found')
      return
    }

    try {
      setIsTransferring(true)

      const caller = participants.find(p => !p.metadata || !p.metadata.includes('is_agent'))
      if (!caller) {
        warning('No Caller Found', 'No caller found in the room to transfer')
        return
      }

      if (transferType === 'phone') {
        const response = await api.post('/api/twilio/dial', {
          phone_number: transferToPhone,
          room_name: room.name,
          agent_name: participantName
        })

        success('Phone Transfer Initiated', `Calling ${transferToPhone} for warm transfer`)

        setNotifications(prev => [...prev, {
          id: `phone-transfer-${Date.now()}`,
          type: 'transfer' as const,
          title: 'Phone Transfer Initiated',
          message: `Calling ${transferToPhone} for warm transfer`,
          timestamp: 'Just now',
          unread: true
        }])
      }
      else {
        const toRoom = `agent-room-${transferToAgent.toLowerCase().replace(/\s+/g, '-')}`

        const response = await api.post('/api/transfer/initiate', {
          from_room: room.name,
          to_room: toRoom,
          from_agent: participantName,
          to_agent: transferToAgent,
          caller_name: caller.name || caller.identity
        })

        const transferInfo = response.data
        setActiveTransfer(transferInfo)

        success('Transfer Initiated', `Warm transfer to ${transferToAgent} has been initiated`)

        setNotifications(prev => [...prev, {
          id: `transfer-${Date.now()}`,
          type: 'transfer' as const,
          title: 'Transfer Initiated',
          message: `Warm transfer to ${transferToAgent} has been initiated`,
          timestamp: 'Just now',
          unread: true
        }])

        setConversationHistory(prev => [...prev, {
          speaker: participantName,
          message: `Initiating warm transfer to ${transferToAgent}. Call summary: ${transferInfo.summary}`,
          timestamp: new Date().toISOString()
        }])
      }

    } catch (err) {
      error('Transfer Failed', err instanceof Error ? err.message : 'Failed to initiate transfer')
    } finally {
      setIsTransferring(false)
    }
  }

  const playTransferSummary = async () => {
    if (!activeTransfer?.summary) return

    try {
      setIsPlayingSummary(true)

      const response = await api.post('/api/speech/generate', {
        text: `Warm transfer summary for ${activeTransfer.to_agent}: ${activeTransfer.summary}`,
        voice: 'alloy'
      })

      if (response.data.audio) {
        try {
          const decodedData = atob(response.data.audio)
          const fallbackData = JSON.parse(decodedData)

          if (fallbackData.type === 'fallback') {
            const utterance = new SpeechSynthesisUtterance(fallbackData.text)
            utterance.onend = () => setIsPlayingSummary(false)
            utterance.onerror = () => {
              setIsPlayingSummary(false)
              error('Speech Error', 'Failed to play transfer summary')
            }
            speechSynthesis.speak(utterance)

            warning('TTS Fallback', 'Using browser speech synthesis. OpenAI TTS quota exceeded.')
          } else {
            throw new Error('Not fallback data')
          }
        } catch (parseError) {
          const audio = new Audio(`data:audio/mp3;base64,${response.data.audio}`)
          audio.onended = () => setIsPlayingSummary(false)
          audio.onerror = () => {
            setIsPlayingSummary(false)
            error('Audio Error', 'Failed to play transfer summary')
          }
          await audio.play()
        }
      } else {
        setIsPlayingSummary(false)
        error('Audio Error', 'Failed to generate speech for transfer summary')
      }

    } catch (err) {
      console.error('Error playing transfer summary:', err)
      setIsPlayingSummary(false)
      error('Audio Error', 'Failed to play transfer summary')
    }
  }

  const completeTransfer = async () => {
    if (!activeTransfer || !room) return

    try {
      const response = await api.post('/api/transfer/complete', {
        transfer_id: activeTransfer.transfer_id,
        from_room: room.name,
        to_room: activeTransfer.to_room
      })

      setConversationHistory(prev => [...prev, {
        speaker: participantName,
        message: 'Transfer completed successfully - Agent A has exited the call',
        timestamp: new Date().toISOString()
      }])

      success('Transfer Completed', 'Warm transfer completed successfully. Agent A has exited the call.')

      setTimeout(() => {
        disconnectFromRoom()
      }, 3000)

    } catch (err) {
      console.error('Error completing transfer:', err)
      error('Transfer Failed', err instanceof Error ? err.message : 'Failed to complete transfer')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Agent Interface</h1>
              <p className="text-zinc-300 text-lg">Welcome, {participantName}</p>
              {currentRoomName && (
                <p className="text-zinc-400 text-sm">Room: {currentRoomName}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <NotificationPanel
                notifications={notifications}
                onNotificationClick={(notification) => {
                }}
                onMarkAllRead={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                }}
              />
              <MainButton
                name="Back to Home"
                variant="light"
                size="sm"
                onClick={() => router.push('/')}
              />
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="mb-8 flex items-center justify-between p-6 bg-[#0D0D0D] border border-white/5 rounded-[20px] hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
          <div className="flex items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' :
              isConnecting ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50' :
                'bg-red-500 shadow-lg shadow-red-500/50'
              }`} />
            <span className="font-semibold text-white text-lg">
              {isConnected ? 'Connected' :
                isConnecting ? 'Connecting...' :
                  'Disconnected'}
            </span>
          </div>

          {activeTransfer && (
            <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-[10px]">
              <span className="text-blue-300 font-medium">Transfer in Progress</span>
            </div>
          )}
        </div>


        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatusCard
            title="Connection Status"
            value={isConnected ? "Connected" : "Disconnected"}
            icon={Phone}
            status={isConnected ? 'online' : 'offline'}
            trend={isConnected ? { value: 100, isPositive: true } : undefined}
          />
          <StatusCard
            title="Active Participants"
            value={participants.length + 1}
            icon={Users}
            status={participants.length > 0 ? 'online' : 'offline'}
          />
          <StatusCard
            title="Transfer Status"
            value={activeTransfer ? "In Progress" : "Ready"}
            icon={ArrowRight}
            status={activeTransfer ? 'connecting' : 'online'}
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Call Controls */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Call Controls</h2>

            <div className="space-y-4">
              {!isConnected ? (
                <MainButton
                  name={isConnecting ? "Connecting..." : "Start Agent Session"}
                  variant="dark"
                  size="md"
                  onClick={connectToRoom}
                />
              ) : (
                <div className="space-y-4">
                  <MainButton
                    name="End Session"
                    variant="dark"
                    size="md"
                    onClick={disconnectFromRoom}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <IOKnob
                      value={isMuted}
                      onChange={toggleMute}
                      label="Mute"
                      colorOn="#ef4444"
                      colorOff="#6b7280"
                      size={40}
                    />
                    <IOKnob
                      value={isDeafened}
                      onChange={toggleDeafen}
                      label="Deafen"
                      colorOn="#ef4444"
                      colorOff="#6b7280"
                      size={40}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warm Transfer Controls */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <ArrowRight className="w-5 h-5 mr-2" />
              Warm Transfer
            </h2>

            {!activeTransfer ? (
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTransferType('agent')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${transferType === 'agent'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                  >
                    Agent
                  </button>
                  <button
                    onClick={() => setTransferType('phone')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${transferType === 'phone'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                  >
                    Phone
                  </button>
                </div>

                {transferType === 'agent' ? (
                  <div className="relative agent-suggestions-container">
                    <InputField
                      label="Transfer to Agent"
                      name="transferToAgent"
                      type="text"
                      placeholder="Enter agent name"
                      value={transferToAgent}
                      onChange={handleAgentInputChange}
                      onFocus={handleAgentInputFocus}
                      required
                    />

                    {/* Autocomplete Suggestions */}
                    {showAgentSuggestions && filteredAgents.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-zinc-900/90 rounded-[10px] shadow-lg max-h-48 overflow-y-auto">
                        {filteredAgents.map((agent) => (
                          <button
                            key={agent}
                            type="button"
                            onClick={() => selectAgent(agent)}
                            className="w-full p-[15px] px-4 text-left text-white/90 hover:bg-white/5 focus:bg-white/5 focus:outline-none first:rounded-t-[10px] last:rounded-b-[10px] transition-colors h-[50px] flex items-center"
                          >
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-blue-400" />
                              <span>{agent}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No suggestions message */}
                    {showAgentSuggestions && filteredAgents.length === 0 && transferToAgent.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-zinc-900/90 rounded-[10px] shadow-lg p-[15px] px-4 h-[50px] flex items-center">
                        <div className="flex items-center space-x-2 text-[#787878]">
                          <Users className="w-4 h-4" />
                          <span>No agents found matching "{transferToAgent}"</span>
                        </div>
                      </div>
                    )}

                    {/* No agents available message */}
                    {showAgentSuggestions && availableAgents.length === 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-zinc-900/90 rounded-[10px] shadow-lg p-[15px] px-4 h-[50px] flex items-center">
                        <div className="flex items-center space-x-2 text-[#787878]">
                          <Users className="w-4 h-4" />
                          <span>No agents available. Connect other agents first.</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <InputField
                    label="Transfer to Phone"
                    name="transferToPhone"
                    type="text"
                    placeholder="Enter phone number (e.g., +1234567890)"
                    value={transferToPhone}
                    onChange={(e) => setTransferToPhone(e.target.value)}
                    required
                  />
                )}

                <MainButton
                  name={isTransferring ? "Initiating..." : `Initiate ${transferType === 'phone' ? 'Phone' : 'Agent'} Transfer`}
                  variant="light"
                  size="sm"
                  onClick={initiateTransfer}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#0D0D0D] border border-blue-500/30 rounded-[20px] p-6 hover:border-blue-500/50 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
                  <h3 className="font-semibold text-blue-300 mb-2">Transfer in Progress</h3>
                  <p className="text-sm text-blue-200 mb-2">
                    Transferring to: <strong>{activeTransfer.to_agent}</strong>
                  </p>
                  {activeTransfer.summary && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-blue-300 mb-1">Call Summary:</p>
                      <p className="text-sm text-blue-200 bg-blue-500/20 p-3 rounded-lg mb-3">
                        {activeTransfer.summary}
                      </p>
                      <MainButton
                        name={isPlayingSummary ? "Playing Summary..." : "Play Summary to Agent B"}
                        variant="light"
                        size="sm"
                        onClick={playTransferSummary}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <MainButton
                    name="Complete Transfer"
                    variant="dark"
                    size="sm"
                    onClick={completeTransfer}
                  />
                  <p className="text-xs text-zinc-400 text-center">
                    Agent A will exit the call after completion
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Participants
            </h2>

            <div className="space-y-4">
              {/* Local Participant */}
              <ParticipantCard
                name={`${participantName} (You)`}
                role="agent"
                isConnected={isConnected}
                isMuted={isMuted}
                isDeafened={isDeafened}
                onMute={toggleMute}
                onDeafen={toggleDeafen}
              />

              {/* Remote Participants */}
              {participants.map((participant) => (
                <ParticipantCard
                  key={participant.identity}
                  name={participant.name || participant.identity}
                  role="caller"
                  isConnected={true}
                  isSpeaking={participant.isSpeaking}
                />
              ))}

              {participants.length === 0 && isConnected && (
                <div className="text-center py-8 text-zinc-400">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Waiting for callers to join...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Conversation History
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto p-6 bg-[#0D0D0D] border border-white/5 rounded-[20px] hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
              {conversationHistory.map((entry, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-[#0D0D0D] border border-white/5 rounded-[10px]">
                  <div className="w-8 h-8 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium">
                      {entry.speaker.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-white">{entry.speaker}</span>
                      <span className="text-xs text-zinc-400">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{entry.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AgentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] p-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <AgentPageContent />
    </Suspense>
  )
}
