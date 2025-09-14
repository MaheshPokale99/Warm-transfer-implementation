import React from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from "lucide-react";

interface ParticipantCardProps {
  name: string;
  role: 'agent' | 'caller';
  isConnected: boolean;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  avatar?: string;
  onMute?: () => void;
  onDeafen?: () => void;
  onDisconnect?: () => void;
  className?: string;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  name,
  role,
  isConnected,
  isMuted = false,
  isDeafened = false,
  isSpeaking = false,
  avatar,
  onMute,
  onDeafen,
  onDisconnect,
  className = ""
}) => {
  const getRoleColor = () => {
    switch (role) {
      case 'agent':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'caller':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return 'bg-red-500';
    if (isSpeaking) return 'bg-green-500';
    return 'bg-zinc-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`bg-zinc-800/50 border border-zinc-700/30 rounded-lg p-4 transition-all duration-200 hover:border-zinc-600/50 ${isSpeaking ? 'ring-1 ring-green-500/30' : ''
        } ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="relative">
          <div className={`w-10 h-10 rounded-lg ${getRoleColor()} flex items-center justify-center`}>
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full rounded-lg object-cover" />
            ) : (
              <span className="font-bold text-sm">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Status indicator */}
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900 ${getStatusColor()}`} />
        </div>

        {/* Name and Role */}
        <div className="flex-1">
          <h3 className="font-semibold text-white text-sm">{name}</h3>
          <p className="text-xs text-zinc-400 capitalize">{role}</p>
        </div>

        {/* Connection Status */}
        <div className="text-right">
          <p className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'
            }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </div>

      {/* Controls */}
      {isConnected && (
        <div className="flex items-center gap-2">
          <button
            onClick={onMute}
            className={`p-2 rounded transition-colors ${isMuted
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'
              }`}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            onClick={onDeafen}
            className={`p-2 rounded transition-colors ${isDeafened
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'
              }`}
          >
            {isDeafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="p-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors ml-auto"
            >
              <PhoneOff size={16} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ParticipantCard;
