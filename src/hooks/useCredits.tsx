import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabaseClient } from '@/lib/supabase-client';

interface Credits {
  wat_credits: number;
  srt_credits: number;
  ppdt_credits: number;
  has_unlimited: boolean;
}

export function useCredits() {
  const { user, session } = useAuth();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!user || !session) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('user_credits')
        .select('wat_credits, srt_credits, ppdt_credits, has_unlimited')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching credits:', error);
        return;
      }

      if (!data) {
        // Create initial credits for user
        const { data: newCredits, error: insertError } = await supabaseClient
          .from('user_credits')
          .insert({
            user_id: user.id,
            wat_credits: 10,
            srt_credits: 10,
            ppdt_credits: 2,
            has_unlimited: false,
          })
          .select('wat_credits, srt_credits, ppdt_credits, has_unlimited')
          .single();

        if (insertError) {
          console.error('Error creating credits:', insertError);
          return;
        }

        setCredits(newCredits);
        return;
      }

      setCredits(data);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCredits = async (testType: 'wat' | 'srt' | 'ppdt', itemCount: number = 1) => {
    if (!session) return { can_take_test: false, credits: 0 };

    try {
      const { data, error } = await supabaseClient.functions.invoke('manage-credits', {
        body: { action: 'check', test_type: testType, item_count: itemCount },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking credits:', error);
      return { can_take_test: false, credits: 0 };
    }
  };

  const consumeCredit = async (testType: 'wat' | 'srt' | 'ppdt', itemCount: number = 1) => {
    if (!session) return { success: false };

    try {
      const { data, error } = await supabaseClient.functions.invoke('manage-credits', {
        body: { action: 'consume', test_type: testType, item_count: itemCount },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      // Refresh credits after consumption
      await fetchCredits();
      
      return data;
    } catch (error) {
      console.error('Error consuming credit:', error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [user, session]);

  return {
    credits,
    loading,
    checkCredits,
    consumeCredit,
    fetchCredits,
  };
}