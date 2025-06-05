import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { STRIPE_CONFIG } from '../config/stripe';

export function useSubscription() {
  const [loading, setLoading] = useState(false);

  const startFreeTrial = async (plan: 'basic' | 'premium') => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Create a temporary user account
        const email = `trial_${Date.now()}@temp.auramind.app`;
        const password = crypto.randomUUID();
        
        const { data, error } = await supabase.auth.signUp({
          email,
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
        
        // Store trial info in localStorage for persistence
        localStorage.setItem('trial_info', JSON.stringify({
          plan,
          start: new Date().toISOString(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));

        return { success: true };
      }
      
      return { success: false, error: 'User already exists' };
    } catch (error) {
      console.error('Trial start error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async (priceId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/pricing',
        }),
      });

      const session = await response.json();
      
      window.location.href = session.url;
    } catch (error) {
      console.error('Subscription error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    startFreeTrial,
    createCheckoutSession,
  };
}