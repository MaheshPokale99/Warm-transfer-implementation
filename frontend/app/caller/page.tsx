'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Phone, Users } from 'lucide-react'
import { Room, RoomEvent, RemoteParticipant, Track, ConnectionState } from 'livekit-client'
import api from '../../lib/axios'
import MainButton from '../../components/ui/MainButton'
import IOKnob from '../../components/ui/IOKnob'
import StatusCard from '../../components/ui/StatusCard'
import NotificationPanel from '../../components/ui/NotificationPanel'
import ParticipantCard from '../../components/ui/ParticipantCard'
import { useNotification } from '../../components/ui/NotificationProvider'

interface CallerPageProps { }

function CallerPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const participantName = searchParams.get('name') || 'Caller'
  const { success, error } = useNotification()

  const [room, setRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [transferInProgress, setTransferInProgress] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [availableAgents, setAvailableAgents] = useState<string[]>([])
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'call' as const,
      title: 'Agent Connected',
      message: 'An agent has joined your call',
      timestamp: '1 min ago',
      unread: true
    }
  ])
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  const currentRoomRef = useRef<Room | null>(null)
  const isTransferringRef = useRef(false)
  const oldRoomRef = useRef<Room | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room && room.state !== 'disconnected') {
        room.disconnect()
      }
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.close()
      }
    }
  }, [room, wsConnection])

  // Fetch available agents
  useEffect(() => {
    const fetchAvailableAgents = async () => {
      try {
        const response = await api.get('/api/agents/available')
        if (response.data && response.data.agents) {
          setAvailableAgents(response.data.agents)
          if (!selectedAgent && response.data.agents.length > 0) {
            setSelectedAgent(response.data.agents[0])
          }
        } else {
          setAvailableAgents([])
        }
      } catch (error) {
        setAvailableAgents([])
      }
    }

    fetchAvailableAgents()
  }, [selectedAgent])

  const handleTransferNotification = async (callerToken: string, destinationRoom: string, transferId: string) => {
    try {

      setTransferInProgress(true)
      isTransferringRef.current = true

      if (!callerToken || !destinationRoom || !transferId) {
        error('Transfer Failed', 'Invalid transfer notification received')
        setTransferInProgress(false)
        isTransferringRef.current = false
        return
      }

      setNotifications(prev => [...prev, {
        id: `transfer-${transferId}`,
        type: 'call' as const,
        title: 'Transfer in Progress',
        message: 'You are being transferred to another agent. Please wait...',
        timestamp: 'Just now',
        unread: true
      }])

      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured')
      }

      const oldRoom = room
      const oldWs = wsConnection
      oldRoomRef.current = oldRoom

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

        setRoom(newRoom)
        currentRoomRef.current = newRoom
        setIsConnected(true)
        setTransferInProgress(false)
        isTransferringRef.current = false

        success('Transfer Complete', 'Successfully transferred to new agent')

        const existingParticipants = Array.from(newRoom.remoteParticipants.values())
        setParticipants(existingParticipants)

        const newWsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/${destinationRoom}`
        const newWs = new WebSocket(newWsUrl)

        newWs.onopen = () => {
          newWs.send(JSON.stringify({ type: 'CALLER_JOINED', message: 'Caller joined after transfer' }))
        }

        newWs.onmessage = (event) => {
          const message = event.data
          try {
            const data = JSON.parse(message)
            if (data.type === 'TRANSFER_NOTIFICATION') {
              const { caller_token, destination_room, transfer_id } = data
              handleTransferNotification(caller_token, destination_room, transfer_id)
            }
          } catch (error) {
          }
        }

        newWs.onclose = () => {
        }

        newWs.onerror = (error) => {
          console.error('New WebSocket error:', error)
        }

        setWsConnection(newWs)

        setTimeout(() => {
          if (oldRoom && oldRoom !== newRoom && oldRoom.state !== 'disconnected') {
            oldRoom.removeAllListeners()
            oldRoom.disconnect()
          }
          if (oldWs && oldWs !== newWs && oldWs.readyState === WebSocket.OPEN) {
            oldWs.close()
          }
        }, 1000)
      })

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        setParticipants(prev => {
          const exists = prev.some(p => p.identity === participant.identity)
          if (exists) return prev
          return [...prev, participant]
        })

        setNotifications(prev => [...prev, {
          id: `new-agent-${Date.now()}`,
          type: 'call' as const,
          title: 'Agent Connected',
          message: `${participant.name || participant.identity} has joined the call`,
          timestamp: 'Just now',
          unread: true
        }])
      })

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity))

        setNotifications(prev => [...prev, {
          id: `agent-left-${Date.now()}`,
          type: 'call' as const,
          title: 'Agent Disconnected',
          message: `${participant.name || participant.identity} has left the call`,
          timestamp: 'Just now',
          unread: true
        }])
      })

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach()
          audioElement.play().catch(err => {
            console.error('Error playing audio:', err)
          })
        }
      })

      newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach()
      })

      newRoom.on(RoomEvent.Disconnected, () => {
        if (currentRoomRef.current === newRoom && !isTransferringRef.current) {
          setIsConnected(false)
          setParticipants([])
        }
      })

      newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Disconnected) {
          error('Transfer Failed', 'Failed to connect to new agent room')
          setTransferInProgress(false)
          isTransferringRef.current = false
        }
      })

      await newRoom.connect(livekitUrl, callerToken)

    } catch (err) {
      setTransferInProgress(false)
      isTransferringRef.current = false
      error('Transfer Failed', 'Failed to complete transfer to new agent')

      if (room && room.state === 'connected') {
        setIsConnected(true)
      }
    }
  }

  const connectToRoom = async () => {
    try {
      setIsConnecting(true)

      if (!selectedAgent) {
        error('No Agent Selected', 'Please select an agent to connect to')
        setIsConnecting(false)
        return
      }

      const roomName = `agent-room-${selectedAgent.toLowerCase().replace(/\s+/g, '-')}`

      const response = await api.post('/api/token/generate', {
        room_name: roomName,
        participant_name: participantName,
        is_agent: false
      })

      const roomData = response.data

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
        setRoom(newRoom)
        currentRoomRef.current = newRoom
        success('Connected', 'Successfully connected to agent')

        const existingParticipants = Array.from(newRoom.remoteParticipants.values())
        setParticipants(existingParticipants)

        existingParticipants.forEach(participant => {
          setNotifications(prev => [...prev, {
            id: `existing-${participant.identity}`,
            type: 'call' as const,
            title: 'Agent Already Connected',
            message: `${participant.name || participant.identity} is already in the call`,
            timestamp: 'Just now',
            unread: true
          }])
        })

        // Setup WebSocket connection
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/${roomName}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'CALLER_CONNECTED', message: 'Caller connected' }))
        }

        ws.onmessage = (event) => {
          const message = event.data
          try {
            const data = JSON.parse(message)
            if (data.type === 'TRANSFER_NOTIFICATION') {
              const { caller_token, destination_room, transfer_id } = data
              handleTransferNotification(caller_token, destination_room, transfer_id)
            }
          } catch (error) {
            // Handle legacy format if needed
            if (message.startsWith('TRANSFER_NOTIFICATION:')) {
              const parts = message.split(':')
              if (parts.length >= 4) {
                const callerToken = parts[1]
                const destinationRoom = parts[2]
                const transferId = parts[3]
                handleTransferNotification(callerToken, destinationRoom, transferId)
              }
            }
          }
        }

        ws.onclose = () => {
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }

        setWsConnection(ws)
      })

      newRoom.on(RoomEvent.Disconnected, () => {
        if (!isTransferringRef.current && currentRoomRef.current === newRoom) {
          setIsConnected(false)
          setIsConnecting(false)
          setParticipants([])
        }
      })

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        setParticipants(prev => {
          const exists = prev.some(p => p.identity === participant.identity)
          if (exists) return prev
          return [...prev, participant]
        })

        setNotifications(prev => [...prev, {
          id: `agent-${Date.now()}`,
          type: 'call' as const,
          title: 'Agent Connected',
          message: `${participant.name || participant.identity} has joined the call`,
          timestamp: 'Just now',
          unread: true
        }])
      })

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity))

        setNotifications(prev => [...prev, {
          id: `agent-left-${Date.now()}`,
          type: 'call' as const,
          title: 'Agent Disconnected',
          message: `${participant.name || participant.identity} has left the call`,
          timestamp: 'Just now',
          unread: true
        }])
      })

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach()
          audioElement.play().catch(err => {
            console.error('Error playing audio:', err)
          })
        }
      })

      newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach()
      })

      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured. Please set NEXT_PUBLIC_LIVEKIT_URL in your environment variables.')
      }

      await newRoom.connect(livekitUrl, roomData.token)

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
      currentRoomRef.current = null
      setIsConnected(false)
      setParticipants([])
    }
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.close()
      setWsConnection(null)
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
      } else {
        room.remoteParticipants.forEach(participant => {
          participant.audioTrackPublications.forEach(publication => {
            if (publication.track) {
              publication.track.detach()
            }
          })
        })
      }
      setIsDeafened(!isDeafened)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Caller Interface</h1>
              <p className="text-zinc-300 text-lg">Welcome, {participantName}</p>
              {room && room.name && (
                <p className="text-zinc-400 text-sm">Room: {room.name}</p>
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

        <div className="mb-8 flex items-center justify-between p-6 bg-[#0D0D0D] border border-white/5 rounded-[20px] hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
          <div className="flex items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${transferInProgress ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50' :
              isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' :
                isConnecting ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50' :
                  'bg-red-500 shadow-lg shadow-red-500/50'
              }`} />
            <span className="font-semibold text-white text-lg">
              {transferInProgress ? 'Transferring...' :
                isConnected ? 'Connected' :
                  isConnecting ? 'Connecting...' :
                    'Disconnected'}
            </span>
          </div>
          {transferInProgress && (
            <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-[10px]">
              <span className="text-yellow-300 font-medium">Please wait...</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatusCard
            title="Connection Status"
            value={transferInProgress ? "Transferring..." : isConnected ? "Connected" : "Disconnected"}
            icon={Phone}
            status={transferInProgress ? 'connecting' : isConnected ? 'online' : 'offline'}
            trend={isConnected ? { value: 100, isPositive: true } : undefined}
          />
          <StatusCard
            title="Active Participants"
            value={participants.length + 1}
            icon={Users}
            status={participants.length > 0 ? 'online' : 'offline'}
          />
          <StatusCard
            title="Call Status"
            value={transferInProgress ? "Transfer" : isConnected ? "Active" : "Idle"}
            icon={Phone}
            status={isConnected ? 'online' : 'offline'}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Call Controls</h2>

            <div className="space-y-4">
              {!isConnected ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Select Agent</label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      disabled={availableAgents.length === 0 || isConnecting}
                    >
                      {availableAgents.length === 0 ? (
                        <option value="">No agents available</option>
                      ) : (
                        availableAgents.map((agent) => (
                          <option key={agent} value={agent}>{agent}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <MainButton
                    name={isConnecting ? "Connecting..." : "Connect to Agent"}
                    variant="dark"
                    size="md"
                    onClick={connectToRoom}
                    disabled={availableAgents.length === 0 || isConnecting || !selectedAgent}
                  />
                </>
              ) : (
                <div className="space-y-4">
                  <MainButton
                    name="End Call"
                    variant="dark"
                    size="md"
                    onClick={disconnectFromRoom}
                    disabled={transferInProgress}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <IOKnob
                      value={isMuted}
                      onChange={toggleMute}
                      label="Mute"
                      colorOn="#ef4444"
                      colorOff="#6b7280"
                      size={40}
                      disabled={transferInProgress}
                    />
                    <IOKnob
                      value={isDeafened}
                      onChange={toggleDeafen}
                      label="Deafen"
                      colorOn="#ef4444"
                      colorOff="#6b7280"
                      size={40}
                      disabled={transferInProgress}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Participants
            </h2>

            <div className="space-y-4">
              <ParticipantCard
                name={`${participantName} (You)`}
                role="caller"
                isConnected={isConnected}
                isMuted={isMuted}
                isDeafened={isDeafened}
                onMute={toggleMute}
                onDeafen={toggleDeafen}
              />

              {participants.map((participant) => (
                <ParticipantCard
                  key={participant.identity}
                  name={participant.name || participant.identity}
                  role="agent"
                  isConnected={true}
                  isSpeaking={participant.isSpeaking}
                />
              ))}

              {participants.length === 0 && isConnected && !transferInProgress && (
                <div className="text-center py-8 text-zinc-400">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Waiting for an agent to join...</p>
                </div>
              )}

              {transferInProgress && (
                <div className="text-center py-8 text-yellow-400">
                  <div className="animate-spin w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Transferring to new agent...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CallerPage({ }: CallerPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] p-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <CallerPageContent />
    </Suspense>
  )
}