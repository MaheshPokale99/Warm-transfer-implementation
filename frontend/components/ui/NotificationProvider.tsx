'use client'

import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: Notification['type'], title: string, message?: string, duration = 5000) => {
    const id = Date.now() + Math.random().toString();
    const notification: Notification = { id, type, title, message, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const success = (title: string, message?: string, duration?: number) => 
    addNotification('success', title, message, duration);
  const error = (title: string, message?: string, duration?: number) => 
    addNotification('error', title, message, duration);
  const warning = (title: string, message?: string, duration?: number) => 
    addNotification('warning', title, message, duration);
  const info = (title: string, message?: string, duration?: number) => 
    addNotification('info', title, message, duration);

  return (
    <NotificationContext.Provider value={{ success, error, warning, info, removeNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC<{ 
  notifications: Notification[]; 
  onRemove: (id: string) => void; 
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onRemove={() => onRemove(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const NotificationToast: React.FC<{ 
  notification: Notification; 
  onRemove: () => void; 
}> = ({ notification, onRemove }) => {
  const { type, title, message } = notification;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-500',
          bgColor: 'bg-zinc-800',
          borderColor: 'border-green-500/20',
          titleColor: 'text-white',
          messageColor: 'text-zinc-300'
        };
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-zinc-800',
          borderColor: 'border-red-500/20',
          titleColor: 'text-white',
          messageColor: 'text-zinc-300'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-500',
          bgColor: 'bg-zinc-800',
          borderColor: 'border-yellow-500/20',
          titleColor: 'text-white',
          messageColor: 'text-zinc-300'
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-500',
          bgColor: 'bg-zinc-800',
          borderColor: 'border-blue-500/20',
          titleColor: 'text-white',
          messageColor: 'text-zinc-300'
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`w-full ${styles.bgColor} ${styles.borderColor} border rounded-lg shadow-lg p-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${styles.iconColor}`}>
          <Icon size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${styles.titleColor}`}>
            {title}
          </h4>
          {message && (
            <p className={`text-sm mt-1 ${styles.messageColor}`}>
              {message}
            </p>
          )}
        </div>
        
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-zinc-400 hover:text-zinc-300 transition-colors duration-200"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default NotificationProvider;
