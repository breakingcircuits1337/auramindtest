import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { STRIPE_CONFIG } from '../config/stripe';

export function useSubscription() {
  const [loading, setLoading] = useState(false);

  const createCheckoutSession = async (priceId: string) => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/pricing`,
          mode: 'subscription'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Subscription error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createCheckoutSession,
  };
}