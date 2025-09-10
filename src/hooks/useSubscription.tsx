import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabaseClient } from '@/lib/supabase-client';

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  starts_at: string;
  expires_at: string;
  status: string;
  currency?: string;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user || !session) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return;
      }

      // Check if subscription is still valid (not expired)
      if (data && new Date(data.expires_at) > new Date()) {
        setSubscription(data);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user, session]);

  const hasActivePlan = () => {
    return subscription !== null;
  };

  return {
    subscription,
    loading,
    hasActivePlan,
    fetchSubscription,
  };
}