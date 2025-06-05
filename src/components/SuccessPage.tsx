import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const SuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard after 5 seconds
    const timeout = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-success-100 dark:bg-success-900/50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle size={32} className="text-success-600 dark:text-success-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Payment Successful!
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Thank you for subscribing to AuraMind. Your account has been activated and you now have access to all features.
          </p>
          
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div className="bg-success-500 h-2 rounded-full animate-[progress_5s_ease-in-out]"></div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting you to the dashboard...
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;