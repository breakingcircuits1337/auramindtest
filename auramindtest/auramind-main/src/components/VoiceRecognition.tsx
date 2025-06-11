import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, Loader2 } from 'lucide-react';
import { voiceAssistant } from '../lib/voiceAssistant';

const VoiceRecognition: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const updateTranscript = (event: CustomEvent) => {
      const { text, interim, confidence: conf } = event.detail;
      
      if (interim) {
        setInterimTranscript(text);
      } else {
        setTranscript(text);
        setInterimTranscript('');
        setConfidence(conf || 0);
        
        // Clear transcript after 3 seconds of inactivity
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current);
        }
        transcriptTimeoutRef.current = setTimeout(() => {
          setTranscript('');
          setConfidence(0);
        }, 3000);
      }
    };

    const handleProcessingStart = () => setIsProcessing(true);
    const handleProcessingEnd = () => setIsProcessing(false);

    window.addEventListener('transcript-update', updateTranscript as EventListener);
    window.addEventListener('processing-start', handleProcessingStart);
    window.addEventListener('processing-end', handleProcessingEnd);

    return () => {
      window.removeEventListener('transcript-update', updateTranscript as EventListener);
      window.removeEventListener('processing-start', handleProcessingStart);
      window.removeEventListener('processing-end', handleProcessingEnd);
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
    };
  }, []);

  const toggleListening = () => {
    const isActive = voiceAssistant.toggleListening();
    setIsListening(isActive);
    if (!isActive) {
      setTranscript('');
      setInterimTranscript('');
      setConfidence(0);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 size={24} className="animate-spin" />
            ) : isListening ? (
              <Volume2 size={24} />
            ) : (
              <Mic size={24} />
            )}
          </button>

          {(transcript || interimTranscript) && (
            <div className="flex-1">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                {transcript && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {transcript}
                    </p>
                    {confidence > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                          <div 
                            className="bg-green-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {interimTranscript && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    {interimTranscript}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {isListening && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Listening... Speak your command
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VoiceRecognition