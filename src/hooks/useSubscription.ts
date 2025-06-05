import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSubscription() {
  const [loading, setLoading] = useState(false);

  const startFreeTrial = async (plan: 'basic' | 'premium') => {
    try {
      setLoading(true);
      
      // Generate a unique email for the trial user
      const trialEmail = `trial_${Date.now()}@temp.auramind.app`;
      const password = crypto.randomUUID();
      
      const { data, error } = await supabase.auth.signUp({
        email: trialEmail,
        password,
        options: {
          data: {
            trial_start: new Date().toISOString(),
            trial_plan: plan,
            trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });

      if (error) throw error;
      
      // Store trial info in localStorage
      localStorage.setItem('trial_info', JSON.stringify({
        plan,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      return { success: true, data };
    } catch (error) {
      console.error('Trial start error:', error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    startFreeTrial
  };
}