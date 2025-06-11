
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Users, 
  FileText,
  Plus,
  RefreshCw,
  Settings,
  ExternalLink
} from 'lucide-react';
import { calendarManager, CalendarEvent, ConflictDetection, MeetingPreparation } from '../lib/calendar';

interface CalendarIntegrationProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function CalendarIntegration({ isVisible, onClose }: CalendarIntegrationProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictDetection[]>([]);
  const [preparations, setPreparations] = useState<MeetingPreparation[]>([]);
  const [connectedCalendars, setConnectedCalendars] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'conflicts' | 'preparation'>('schedule');

  useEffect(() => {
    if (isVisible) {
      loadCalendarData();
    }
  }, [isVisible]);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      // Load events for the next 7 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      
      const calendarEvents = calendarManager.getEvents(startDate, endDate);
      setEvents(calendarEvents);
      
      // Check for conflicts in upcoming events
      const upcomingConflicts: ConflictDetection[] = [];
      for (const event of calendarEvents.slice(0, 10)) {
        const conflict = calendarManager.detectConflicts(event);
        if (conflict.hasConflict) {
          upcomingConflicts.push(conflict);
        }
      }
      setConflicts(upcomingConflicts);
      
      // Generate preparations for next 3 events
      const nextEvents = calendarManager.getUpcomingEvents(48); // Next 48 hours
      const meetingPreps: MeetingPreparation[] = [];
      for (const event of nextEvents.slice(0, 3)) {
        try {
          const prep = await calendarManager.generateMeetingPreparation(event);
          meetingPreps.push(prep);
        } catch (error) {
          console.error('Error generating preparation:', error);
        }
      }
      setPreparations(meetingPreps);
      
      setConnectedCalendars(calendarManager.getConnectedCalendars());
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    // In production, this would trigger OAuth flow
    alert('Google Calendar integration would be implemented here. This would open OAuth flow to connect your Google Calendar.');
  };

  const connectOutlookCalendar = async () => {
    // In production, this would trigger OAuth flow
    alert('Outlook Calendar integration would be implemented here. This would open OAuth flow to connect your Outlook Calendar.');
  };

  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const end = event.end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    return `${start} - ${end}`;
  };

  const formatEventDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-green-400 bg-green-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getConflictSeverityColor = (severity: string) => {
    return severity === 'error' ? 'text-red-400' : 'text-yellow-400';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-8 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <Calendar className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Calendar Integration</h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadCalendarData}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Connection Status */}
            <div className="px-6 py-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">Connected Calendars:</span>
                  {connectedCalendars.length === 0 ? (
                    <span className="text-gray-500">None connected</span>
                  ) : (
                    <div className="flex space-x-2">
                      {connectedCalendars.map(calendar => (
                        <span 
                          key={calendar}
                          className="px-2 py-1 bg-green-400/10 text-green-400 rounded-md text-sm"
                        >
                          {calendar}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={connectGoogleCalendar}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-md text-sm hover:bg-blue-500/30 transition-colors"
                  >
                    + Google
                  </button>
                  <button
                    onClick={connectOutlookCalendar}
                    className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-md text-sm hover:bg-orange-500/30 transition-colors"
                  >
                    + Outlook
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-700/50">
              {[
                { id: 'schedule', label: 'Schedule', icon: Calendar },
                { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
                { id: 'preparation', label: 'Preparation', icon: FileText }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 transition-colors ${
                    activeTab === tab.id
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                    <span className="text-gray-400">Loading calendar data...</span>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'schedule' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-white">Upcoming Events</h3>
                        <span className="text-gray-400">{events.length} events</span>
                      </div>
                      
                      {events.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No upcoming events found</p>
                          <p className="text-sm mt-1">Connect your calendar to see events</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {events.map(event => (
                            <div
                              key={event.id}
                              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h4 className="text-white font-medium">{event.title}</h4>
                                    <span className={`px-2 py-1 rounded-md text-xs ${getPriorityColor(event.priority)}`}>
                                      {event.priority}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 text-gray-400 text-sm">
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-4 h-4" />
                                      <span>{formatEventDate(event.start)} • {formatEventTime(event)}</span>
                                    </div>
                                    
                                    {event.location && (
                                      <div className="flex items-center space-x-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{event.location}</span>
                                      </div>
                                    )}
                                    
                                    {event.attendees && event.attendees.length > 0 && (
                                      <div className="flex items-center space-x-1">
                                        <Users className="w-4 h-4" />
                                        <span>{event.attendees.length} attendees</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {event.description && (
                                    <p className="text-gray-300 text-sm mt-2 line-clamp-2">{event.description}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'conflicts' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-white">Scheduling Conflicts</h3>
                        <span className="text-gray-400">{conflicts.length} conflicts</span>
                      </div>
                      
                      {conflicts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
                          <p>No scheduling conflicts detected</p>
                          <p className="text-sm mt-1">Your calendar looks well organized!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {conflicts.map((conflict, index) => (
                            <div
                              key={index}
                              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30"
                            >
                              <div className="flex items-start space-x-3">
                                <AlertTriangle className={`w-5 h-5 mt-0.5 ${getConflictSeverityColor(conflict.severity)}`} />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className={`px-2 py-1 rounded-md text-xs ${
                                      conflict.severity === 'error' 
                                        ? 'bg-red-400/10 text-red-400' 
                                        : 'bg-yellow-400/10 text-yellow-400'
                                    }`}>
                                      {conflict.type.replace('_', ' ')}
                                    </span>
                                    <span className="text-gray-400 text-sm">{conflict.severity}</span>
                                  </div>
                                  
                                  <p className="text-gray-300 mb-2">{conflict.suggestion}</p>
                                  
                                  <div className="text-sm text-gray-400">
                                    <span>Affected events: </span>
                                    {conflict.conflicts.map(event => event.title).join(', ')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'preparation' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-white">Meeting Preparation</h3>
                        <span className="text-gray-400">{preparations.length} meetings</span>
                      </div>
                      
                      {preparations.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No upcoming meetings to prepare for</p>
                          <p className="text-sm mt-1">Preparation assistance will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {preparations.map(prep => (
                            <div
                              key={prep.event.id}
                              className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30"
                            >
                              <div className="mb-4">
                                <h4 className="text-white font-medium mb-1">{prep.event.title}</h4>
                                <p className="text-gray-400 text-sm">
                                  {formatEventDate(prep.event.start)} • {formatEventTime(prep.event)}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="text-gray-200 font-medium mb-2">Preparation Tasks</h5>
                                  <div className="space-y-2">
                                    {prep.preparationTasks.map(task => (
                                      <div key={task.id} className="flex items-start space-x-2">
                                        <CheckCircle className={`w-4 h-4 mt-0.5 ${
                                          task.completed ? 'text-green-400' : 'text-gray-500'
                                        }`} />
                                        <div className="flex-1">
                                          <p className="text-gray-300 text-sm">{task.title}</p>
                                          <p className="text-gray-500 text-xs">{task.estimatedTime} min</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className="text-gray-200 font-medium mb-2">Key Points</h5>
                                  <ul className="space-y-1">
                                    {prep.keyPoints.slice(0, 3).map((point, index) => (
                                      <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                                        <span className="text-purple-400 mt-1">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              
                              {prep.travelInstructions && (
                                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                  <p className="text-blue-300 text-sm">{prep.travelInstructions}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
