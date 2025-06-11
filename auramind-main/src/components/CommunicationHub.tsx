import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  MessageSquare, 
  Calendar, 
  Globe, 
  Star,
  AlertCircle,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  Languages,
  Bell
  Settings
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';

interface Message {
  id: string;
  sender: string;
  content: string;
  subject?: string;
  body?: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  translated?: boolean;
}

interface Event {
  id: string;
  title: string;
  datetime: string;
  location: string;
  participants: string[];
  details: string;
}

interface NotificationSettings {
  groupNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  messageTypes: { [key: string]: boolean }; // e.g., { 'Work': true, 'Health': false }
}

const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'Project Lead',
    subject: 'Meeting Reschedule',
    content: 'Team meeting rescheduled to 3 PM today. Important updates to discuss.',
    timestamp: '10:30 AM',
    priority: 'high',
    category: 'Work'
  },
  {
    id: '2',
    sender: 'Sarah Chen',
    subject: 'Report Review',
    content: '¿Podemos revisar el informe mañana?',
    timestamp: '10:15 AM',
    priority: 'medium',
    category: 'Work',
    translated: true
  },
  {
    id: '3',
    sender: 'Doctor\'s Office',
    subject: 'Appointment Reminder',
    content: 'Reminder: Your appointment is scheduled for tomorrow at 2 PM.',
    timestamp: '9:45 AM',
    priority: 'high',
    category: 'Health'
  }
];

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Quarterly Review Meeting',
    datetime: '2025-03-20T15:00:00',
    location: 'Conference Room A',
    participants: ['John Smith', 'Sarah Chen', 'Mike Johnson'],
    details: 'Q1 performance review and Q2 planning discussion'
  },
  {
    id: '2',
    title: 'Doctor\'s Appointment',
    datetime: '2025-03-21T14:00:00',
    location: 'City Medical Center',
    participants: ['Dr. Williams'],
    details: 'Annual check-up'
  }
];

const CommunicationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'events' | 'briefing'>('messages');
  const [showSettings, setShowSettings] = useState(false);
  const [ref, inView] = useInView({
    // Using the element as the root
    root: null,
    triggerOnce: true,
    threshold: 0.1,
  });

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-error-500 dark:text-error-400';
      case 'medium': return 'text-warning-500 dark:text-warning-400';
      case 'low': return 'text-success-500 dark:text-success-400';
    }
  };

  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };

  const sortedMessages = [...mockMessages].sort((a, b) => {
    // Sort by priority (high to low)
    if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    // Then sort by timestamp (newest to oldest) - assuming timestamp can be compared directly or is parseable
    // This part might need adjustment based on actual timestamp format
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const [filteredMessages, setFilteredMessages] = useState<Message[]>(sortedMessages);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [senderFilter, setSenderFilter] = useState<'all' | string>('all');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    groupNotifications: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    messageTypes: { 'Work': true, 'Health': true, 'Other': true }, // Default preferences
  });


  // Get unique senders for the sender filter dropdown
  const uniqueSenders = Array.from(new Set(mockMessages.map(message => message.sender)));
  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return format(date, 'p'); // e.g., 10:30 AM
    } else if (isTomorrow(date)) {
      return 'Tomorrow ' + format(date, 'p');
    } else if (isThisWeek(date)) {
      return format(date, 'eee p'); // e.g., Mon 10:30 AM
    } else {
      return format(date, 'MMM d, yyyy'); // e.g., Mar 20, 2025
    }
  };

  const toggleNotificationSetting = (type: keyof NotificationSettings | string) => {
    // Implement logic to toggle specific settings
  };

  React.useEffect(() => {
    let messagesToFilter = [...sortedMessages];

    if (priorityFilter !== 'all') {
      messagesToFilter = messagesToFilter.filter(message => message.priority === priorityFilter);
    }

    if (senderFilter !== 'all') {
      messagesToFilter = messagesToFilter.filter(message => message.sender === senderFilter);
    }

    setFilteredMessages(messagesToFilter);
  }, [priorityFilter, senderFilter]); // Re-run effect when filters change



  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary-600 dark:bg-primary-900 text-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Communication Hub</h2>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <p className="text-primary-100">Intelligent message filtering & event management</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'bg-white text-primary-600 dark:bg-gray-800 dark:text-primary-400'
                : 'bg-primary-700/50 text-white hover:bg-primary-700'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'events'
                ? 'bg-white text-primary-600 dark:bg-gray-800 dark:text-primary-400'
                : 'bg-primary-700/50 text-white hover:bg-primary-700'
            }`}
          >
            Upcoming Events
          </button>
          <button
            onClick={() => setActiveTab('briefing')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'briefing'
                ? 'bg-white text-primary-600 dark:bg-gray-800 dark:text-primary-400'
                : 'bg-primary-700/50 text-white hover:bg-primary-700'
            }`}
          >
            Daily Briefing
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'messages' && (
          <div>
            {/* Filter Controls */}
            <div className="flex space-x-4 mb-6">
              <div>
                <label htmlFor="priorityFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by Priority:
                </label>
                <select
                  id="priorityFilter"
                  name="priorityFilter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
              <div>
                <label htmlFor="senderFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by Sender:
                </label>
                <select
                  id="senderFilter"
                  name="senderFilter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={senderFilter}
                  onChange={(e) => setSenderFilter(e.target.value)}
                >
                  <option value="all">All Senders</option>
                  {uniqueSenders.map(sender => <option key={sender} value={sender}>{sender}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              {/* TODO: Implement proactive information retrieval.
              This feature should analyze the content of messages and upcoming events to identify
              relevant information that might be needed by the user.
              For example, if a message mentions a specific project, the system could proactively
              fetch related documents or project timelines and display them in the briefing section
              or as a suggestion within the message view. */}
            {filteredMessages.map((message) => (
                {message.subject && (
                   <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-1">{message.subject}</h4>
                )}
                <p className="text-gray-700 dark:text-gray-300 mb-2">{message.content}</p>

                <div className="flex items-center gap-4">
                  {message.translated && (
                    <div className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400">
                      <Globe size={14} />
                      <span>Translated from Spanish</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Star size={14} />
                    <span>{message.category}</span>
                  </div>
                </div>
                {/* TODO: Implement message summarization feature.
                Add a button or option here to trigger the summarization of the message content or the entire conversation.
                The summarization logic will need to process the message content and generate a concise summary.
                This might involve sending the message content to a backend service or utilizing a client-side library
                that can perform text summarization. */}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            {mockEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-100 dark:hover:border-primary-800 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                  <span className="text-sm text-primary-600 dark:text-primary-400">{formatEventDate(event.datetime)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin size={14} />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users size={14} />
                    <span>{event.participants.length} participants</span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300">{event.details}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'briefing' && (
          <div className="space-y-6">
            <div className="bg-primary-50 dark:bg-primary-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-primary-600 dark:text-primary-400" />
                <span className="font-medium text-primary-700 dark:text-primary-300">Today's Overview</span>
              </div>
                    <div className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400">
                      <Globe size={14} />
                      <span>Translated from Spanish</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Star size={14} />
                    <span>{message.category}</span>
                  </div>
                </div>
              </p>
                        <input
                          type="time"
                          id="quietHoursEnd"
                          value={notificationSettings.quietHoursEnd}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, quietHoursEnd: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
                Good morning! You have 2 high-priority messages and 2 upcoming events today.
                The weather forecast suggests bringing an umbrella.

            {/* Smart Notification Management Settings */}
            {showSettings && (
              <div className="space-y-4 mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white">Notification Settings</h3>
                {/* Group Notifications */}
                <div className="flex items-center justify-between">
                  <label htmlFor="groupNotifications" className="text-sm text-gray-700 dark:text-gray-300">
                    Group Notifications by Conversation
                  </label>
                  <input
                    type="checkbox"
                    id="groupNotifications"
                    checked={notificationSettings.groupNotifications}
                    onChange={() => setNotificationSettings({ ...notificationSettings, groupNotifications: !notificationSettings.groupNotifications })}
                    className="form-checkbox h-4 w-4 text-primary-600 transition duration-150 ease-in-out rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                {/* Quiet Hours */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="quietHoursEnabled" className="text-sm text-gray-700 dark:text-gray-300">
                      Enable Quiet Hours
                    </label>
                    <input
                      type="checkbox"
                      id="quietHoursEnabled"
                      checked={notificationSettings.quietHoursEnabled}
                      onChange={() => setNotificationSettings({ ...notificationSettings, quietHoursEnabled: !notificationSettings.quietHoursEnabled })}
                      className="form-checkbox h-4 w-4 text-primary-600 transition duration-150 ease-in-out rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  {notificationSettings.quietHoursEnabled && (
                    <div className="flex space-x-4">
                      <div>
                        <label htmlFor="quietHoursStart" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Start Time
                        </label>
                        <input
                          type="time"
                          id="quietHoursStart"
                          value={notificationSettings.quietHoursStart}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, quietHoursStart: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="quietHoursEnd" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                          End Time
                        </label>
                        <input
                          type="time"
                          id="quietHoursEnd"
                          value={notificationSettings.quietHoursEnd}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, quietHoursEnd: e.target.value })}
                          className="mt-1 block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {/* Customize Preferences */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Receive notifications for:</p>
                  {Object.keys(notificationSettings.messageTypes).map((type) => (
                    <div key={type} className="flex items-center justify-between">
                      <label htmlFor={`notify-${type}`} className="text-sm text-gray-700 dark:text-gray-300">
                        {type} Messages
                      </label>
                      <input
                        type="checkbox"
                        id={`notify-${type}`}
                        checked={notificationSettings.messageTypes[type]}
                        onChange={() => setNotificationSettings({
                          ...notificationSettings,
                          messageTypes: { ...notificationSettings.messageTypes, [type]: !notificationSettings.messageTypes[type] }
                        })}
                        className="form-checkbox h-4 w-4 text-primary-600 transition duration-150 ease-in-out rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-100 dark:hover:border-primary-800 transition-colors">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-primary-600 dark:text-primary-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Review Notifications</span>
                   </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
                <button className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-100 dark:hover:border-primary-800 transition-colors">
                  <div className="flex items-center gap-2">
                    <Languages size={16} className="text-primary-600 dark:text-primary-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Translation Settings</span>
                   </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CommunicationHub;