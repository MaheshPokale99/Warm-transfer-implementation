import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  status?: 'online' | 'offline' | 'connecting' | 'error';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  icon: Icon,
  status = 'offline',
  trend,
  className = "",
  onClick
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'connecting':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`bg-zinc-800/50 border border-zinc-700/30 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-zinc-600/50 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${getStatusColor()} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
            trend.isPositive 
              ? 'bg-green-500/20 text-green-300' 
              : 'bg-red-500/20 text-red-300'
          }`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-1">{title}</h3>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
};

export default StatusCard;
