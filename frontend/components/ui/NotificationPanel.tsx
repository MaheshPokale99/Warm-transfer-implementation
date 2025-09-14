import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, ArrowRight, Phone, Users, MessageSquare } from "lucide-react";

interface Notification {
  id: string;
  type: 'transfer' | 'call' | 'message' | 'system';
  title: string;
  message: string;
  timestamp: string;
  unread?: boolean;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  className?: string;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => n.unread).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return ArrowRight;
      case 'call':
        return Phone;
      case 'message':
        return MessageSquare;
      case 'system':
        return Users;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'call':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'message':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'system':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg border border-zinc-700/30 transition-all duration-200"
      >
        <Bell size={20} className="text-zinc-300" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-14 w-80 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg shadow-lg z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-zinc-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <button
                      key={notification.id}
                      onClick={() => {
                        onNotificationClick?.(notification);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/30 last:border-b-0 ${notification.unread ? 'bg-zinc-800/20' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${getNotificationColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-white truncate">
                              {notification.title}
                            </p>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate mb-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {notification.timestamp}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-zinc-500 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationPanel;
