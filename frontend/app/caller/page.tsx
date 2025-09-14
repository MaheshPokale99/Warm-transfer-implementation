'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Phone, Users } from 'lucide-react'
import { Room, RoomEvent, RemoteParticipant,  Track } from 'livekit-client'
import api from '../../lib/axios'
import MainButton from '../../components/ui/MainButton'
import IOKnob from '../../components/ui/IOKnob'
import StatusCard from '../../components/ui/StatusCard'
import NotificationPanel from '../../components/ui/NotificationPanel'
import ParticipantCard from '../../components/ui/ParticipantCard'
import { useNotification } from '../../components/ui/NotificationProvider'

interface CallerPageProps {}

export default function CallerPage({}: CallerPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const participantName = searchParams.get('name') || 'Caller'
  const { success, error } = useNotification()
  
  const [room, setRoom] = useState<Room | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
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

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect()
      }
    }
  }, [room])

  const connectToRoom = async () => {
    try {
      setIsConnecting(true)

      const roomName = `caller-room-${Date.now()}`
      
      const response = await api.post('/api/rooms/create', {
        room_name: roomName,
        participant_name: participantName,
        is_agent: false
      })

      const roomData = response.data
      
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
        console.log('Connected to room')
        setIsConnected(true)
        setIsConnecting(false)
        success('Connected', 'Successfully connected to caller room')
      })

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room')
        setIsConnected(false)
        setIsConnecting(false)
      })

      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('Participant connected:', participant.identity)
        setParticipants(prev => [...prev, participant])
        
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
        console.log('Participant disconnected:', participant.identity)
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
        console.log('Track subscribed:', track.kind, participant.identity)
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach()
          audioElement.play()
        }
      })

      newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('Track unsubscribed:', track.kind, participant.identity)
        track.detach()
      })

      // Connect to the room
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
      if (!livekitUrl) {
        throw new Error('LiveKit URL not configured. Please check your environment variables.')
      }

      await newRoom.connect(livekitUrl, roomData.token)
      setRoom(newRoom)

    } catch (err) {
      console.error('Error connecting to room:', err)
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

  return (
    <div className="min-h-screen bg-[var(--background)] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Caller Interface</h1>
              <p className="text-zinc-300 text-lg">Welcome, {participantName}</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationPanel
                notifications={notifications}
                onNotificationClick={(notification) => {
                  console.log('Notification clicked:', notification);
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
            <div className={`w-4 h-4 rounded-full ${
              isConnected ? 'bg-green-500 shadow-lg shadow-green-500/50' : 
              isConnecting ? 'bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50' : 
              'bg-red-500 shadow-lg shadow-red-500/50'
            }`} />
            <span className="font-semibold text-white text-lg">
              {isConnected ? 'Connected' : 
               isConnecting ? 'Connecting...' : 
               'Disconnected'}
            </span>
          </div>
          
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
            title="Call Status"
            value="Active"
            icon={Phone}
            status="online"
          />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Call Controls */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Call Controls</h2>
            
            <div className="space-y-4">
              {!isConnected ? (
                <MainButton
                  name={isConnecting ? "Connecting..." : "Connect to Agent"}
                  variant="dark"
                  size="md"
                  onClick={connectToRoom}
                />
              ) : (
                <div className="space-y-4">
                  <MainButton
                    name="End Call"
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
                role="caller"
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
                  role="agent"
                  isConnected={true}
                  isSpeaking={participant.isSpeaking}
                />
              ))}

              {participants.length === 0 && isConnected && (
                <div className="text-center py-8 text-zinc-400">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Waiting for an agent to join...</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
