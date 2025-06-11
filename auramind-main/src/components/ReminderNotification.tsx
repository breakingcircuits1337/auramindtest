
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Clock, Snooze } from 'lucide-react';
import { TaskReminder } from '../lib/taskManager';

interface ReminderNotificationProps {
  reminder: TaskReminder;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

const ReminderNotification: React.FC<ReminderNotificationProps> = ({
  reminder,
  onDismiss,
  onSnooze
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400 flex-shrink-0">
          <Bell size={16} />
        </div>
        
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
              Task Reminder
            </h4>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {reminder.message}
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => onSnooze(10)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Clock size={12} />
              10m
            </button>
            <button
              onClick={() => onSnooze(30)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Clock size={12} />
              30m
            </button>
            <button
              onClick={onDismiss}
              className="px-2 py-1 text-xs bg-primary-600 dark:bg-primary-500 text-white rounded hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface ReminderSystemProps {}

const ReminderSystem: React.FC<ReminderSystemProps> = () => {
  const [activeReminders, setActiveReminders] = useState<TaskReminder[]>([]);

  useEffect(() => {
    const handleReminder = (event: CustomEvent) => {
      const { reminder } = event.detail;
      setActiveReminders(prev => [...prev, reminder]);
      
      // Auto-dismiss after 30 seconds
      setTimeout(() => {
        setActiveReminders(prev => prev.filter(r => r.id !== reminder.id));
      }, 30000);
    };

    window.addEventListener('task-reminder', handleReminder as EventListener);
    
    return () => {
      window.removeEventListener('task-reminder', handleReminder as EventListener);
    };
  }, []);

  const dismissReminder = (reminderId: string) => {
    setActiveReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  const snoozeReminder = (reminderId: string, minutes: number) => {
    // In a real implementation, this would call the task manager's snooze function
    console.log(`Snoozing reminder ${reminderId} for ${minutes} minutes`);
    dismissReminder(reminderId);
  };

  return (
    <AnimatePresence>
      {activeReminders.map((reminder) => (
        <ReminderNotification
          key={reminder.id}
          reminder={reminder}
          onDismiss={() => dismissReminder(reminder.id)}
          onSnooze={(minutes) => snoozeReminder(reminder.id, minutes)}
        />
      ))}
    </AnimatePresence>
  );
};

export default ReminderSystem;
