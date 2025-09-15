'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
    Phone, Users, ArrowRight, MessageSquare, Volume2
} from 'lucide-react'
import { Room, RoomEvent, RemoteParticipant, Track } from 'livekit-client'
import api from '../../lib'
import MainButton from '../../components/ui/MainButton'
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
    transfer_message?: string
}

function AgentBPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const participantName = searchParams.get('name') || 'Agent B'
    const { success, error } = useNotification()

    const [room, setRoom] = useState<Room | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isConnecting, setIsConnecting] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [isDeafened, setIsDeafened] = useState(false)
    const [participants, setParticipants] = useState<RemoteParticipant[]>([])
    const [currentRoomName, setCurrentRoomName] = useState<string>('')
    const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null)
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
    const [conversationHistory, setConversationHistory] = useState<Array<{ speaker: string, message: string, timestamp: string }>>([])
    const [notifications, setNotifications] = useState<Array<{
        id: string
        type: 'transfer' | 'call'
        title: string
        message: string
        timestamp: string
        unread: boolean
    }>>([
        {
            id: '1',
            type: 'transfer',
            title: 'Waiting for Transfer',
            message: 'Ready to receive warm transfers from other agents',
            timestamp: 'Just now',
            unread: true
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


    const handleIncomingTransfer = (transferId: string, callerName: string, summary: string, transferMessage: string) => {

        setNotifications(prev => [...prev, {
            id: `incoming-transfer-${transferId}`,
            type: 'transfer' as const,
            title: 'Incoming Transfer',
            message: `Caller ${callerName} is being transferred to you`,
            timestamp: 'Just now',
            unread: true
        }])

        setTransferInfo({
            transfer_id: transferId,
            from_room: '',
            to_room: currentRoomName,
            from_agent: '',
            to_agent: 'Agent B',
            caller_name: callerName,
            summary: summary,
            status: 'in_progress',
            created_at: new Date().toISOString(),
            transfer_message: transferMessage
        })

        if (summary && summary !== 'No conversation history available.') {
            setConversationHistory([{
                speaker: 'Previous Agent',
                message: summary,
                timestamp: new Date().toLocaleTimeString()
            }])
        }
    }

    useEffect(() => {
        if (!isConnected || !currentRoomName) return

        const pollForTransfers = async () => {
            try {
                const response = await api.get('/api/transfer/debug/active')
                if (response.data && response.data.transfers) {
                    const transferToThisRoom = response.data.transfers.find((t: any) =>
                        t.to_room === currentRoomName && t.status === 'in_progress'
                    )

                    if (transferToThisRoom && !transferInfo) {
                        setTransferInfo(transferToThisRoom)
                        success('Transfer Received', `Warm transfer from ${transferToThisRoom.from_agent} received`)

                        setNotifications(prev => [...prev, {
                            id: `transfer-received-${Date.now()}`,
                            type: 'transfer' as const,
                            title: 'Transfer Received',
                            message: `Warm transfer from ${transferToThisRoom.from_agent} for caller ${transferToThisRoom.caller_name}`,
                            timestamp: 'Just now',
                            unread: true
                        }])
                    }
                }
            } catch (error) {
            }
        }

        const interval = setInterval(pollForTransfers, 2000)
        return () => clearInterval(interval)
    }, [isConnected, currentRoomName, transferInfo])


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
                success('Connected', 'Successfully connected as Agent B - ready to receive transfers')
                setCurrentRoomName(roomName)

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
                }

                ws.onmessage = (event) => {
                    const message = event.data
                    if (message.startsWith('INCOMING_TRANSFER:')) {
                        const [, transferId, callerName, summary, transferMessage] = message.split(':')
                        handleIncomingTransfer(transferId, callerName, summary, transferMessage)
                    }
                }

                ws.onclose = () => {
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
                    id: `participant-${Date.now()}`,
                    type: 'call' as const,
                    title: 'Participant Connected',
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
                    id: `participant-left-${Date.now()}`,
                    type: 'call' as const,
                    title: 'Participant Disconnected',
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

    return (
        <div className="min-h-screen bg-[var(--background)] p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Agent B - Transfer Receiver</h1>
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
                            {isConnected ? 'Ready to Receive Transfers' :
                                isConnecting ? 'Connecting...' :
                                    'Disconnected'}
                        </span>
                    </div>

                    {transferInfo && (
                        <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-[10px]">
                            <span className="text-green-300 font-medium">Transfer Received</span>
                        </div>
                    )}
                </div>

                {/* Status Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <StatusCard
                        title="Connection Status"
                        value={isConnected ? "Ready" : "Disconnected"}
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
                        value={transferInfo ? "Transfer Active" : "Waiting"}
                        icon={ArrowRight}
                        status={transferInfo ? 'connecting' : 'online'}
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
                                    name={isConnecting ? "Connecting..." : "Start Agent B Session"}
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
                                        <button
                                            onClick={toggleMute}
                                            className={`p-3 rounded-lg border transition-colors ${isMuted
                                                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                                                : 'bg-zinc-700/50 border-zinc-600/30 text-zinc-300 hover:bg-zinc-600/50'
                                                }`}
                                        >
                                            <Volume2 className="w-5 h-5 mx-auto" />
                                            <span className="text-xs mt-1 block">Mute</span>
                                        </button>
                                        <button
                                            onClick={toggleDeafen}
                                            className={`p-3 rounded-lg border transition-colors ${isDeafened
                                                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                                                : 'bg-zinc-700/50 border-zinc-600/30 text-zinc-300 hover:bg-zinc-600/50'
                                                }`}
                                        >
                                            <Volume2 className="w-5 h-5 mx-auto" />
                                            <span className="text-xs mt-1 block">Deafen</span>
                                        </button>
                                    </div>

                                    {/* Agent B is a transfer receiver - no transfer controls needed */}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transfer Information */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-white flex items-center">
                            <ArrowRight className="w-5 h-5 mr-2" />
                            Transfer Information
                        </h2>

                        {transferInfo ? (
                            <div className="bg-[#0D0D0D] border border-green-500/30 rounded-[20px] p-6 hover:border-green-500/50 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
                                <h3 className="font-semibold text-green-300 mb-2">Transfer Received</h3>
                                <p className="text-sm text-green-200 mb-2">
                                    From: <strong>{transferInfo.from_agent}</strong>
                                </p>
                                <p className="text-sm text-green-200 mb-2">
                                    Caller: <strong>{transferInfo.caller_name}</strong>
                                </p>
                                {transferInfo.summary && (
                                    <div className="mt-3">
                                        <p className="text-sm font-medium text-green-300 mb-1">Call Summary:</p>
                                        <p className="text-sm text-green-200 bg-green-500/20 p-3 rounded-lg">
                                            {transferInfo.summary}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#0D0D0D] border border-white/5 rounded-[20px] p-6 hover:border-white/10 transition-all duration-300" style={{ boxShadow: "inset 0px 2px 0px 0px rgba(184, 180, 180, 0.08)" }}>
                                <div className="text-center py-8 text-zinc-400">
                                    <ArrowRight size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Waiting for warm transfer...</p>
                                    <p className="text-sm mt-2">Agent A will transfer a caller to this room</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Participants */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
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
                                <p>Waiting for transferred caller...</p>
                            </div>
                        )}
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
                                    <div className="w-8 h-8 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
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

export default function AgentBPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--background)] p-4 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        }>
            <AgentBPageContent />
        </Suspense>
    )
}
