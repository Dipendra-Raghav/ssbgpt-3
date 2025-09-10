import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { toast } from '@/hooks/use-toast';


interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

const Index = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null
  });

  const fetchStreakData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Always calculate streak based on recent daily activity
      const today = new Date().toISOString().split('T')[0];
      
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('created_at, test_type')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      if (evaluations && evaluations.length > 0) {
        const dailyEvaluations = evaluations.reduce((acc, evaluation) => {
          const date = evaluation.created_at.split('T')[0];
          if (!acc[date]) {
            acc[date] = new Set();
          }
          acc[date].add(evaluation.test_type);
          return acc;
        }, {} as Record<string, Set<string>>);

        let checkDate = new Date(today);
        let streakContinues = true;
        
        while (streakContinues) {
          const dateStr = checkDate.toISOString().split('T')[0];
          const testsOnDate = dailyEvaluations[dateStr];
          
          if (testsOnDate && testsOnDate.size > 0) {
            if (streakContinues) currentStreak++;
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            if (streakContinues) streakContinues = false;
            tempStreak = 0;
          }
          
          checkDate.setDate(checkDate.getDate() - 1);
          
          if (checkDate < new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)) {
            break;
          }
        }
      }

      // Get existing streak record to preserve longest streak
      const { data: streakRecord } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      const finalLongestStreak = Math.max(longestStreak, streakRecord?.longest_streak || 0);
      
      setStreakData({
        currentStreak,
        longestStreak: finalLongestStreak,
        lastActivityDate: today
      });

      await supabase
        .from('user_streaks')
        .upsert({
          user_id: user?.id,
          current_streak: currentStreak,
          longest_streak: finalLongestStreak,
          last_activity_date: today
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error fetching streak data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch streak data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchStreakData();
    }
  }, [user, fetchStreakData]);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Streak Badge - Top Right */}
      <div className="absolute top-6 right-6">
        <div className="bg-card rounded-lg shadow px-4 py-2 flex items-center gap-2 text-sm group relative">
          <Flame className="w-4 h-4 text-primary" />
          <span className="font-medium">Streak:</span>
          <span className="font-bold text-primary">{streakData.currentStreak} Days</span>
          
          {/* Tooltip on Hover */}
          <div className="absolute top-full mt-2 right-0 w-max max-w-xs px-3 py-2 
                          bg-popover text-popover-foreground text-xs rounded-lg 
                          shadow opacity-0 group-hover:opacity-100 transition 
                          whitespace-nowrap z-50">
            Complete any test (PPDT, WAT, or SRT) daily to continue streak.
          </div>
        </div>
      </div>
  
      <div className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            AI-powered SSB Test Preparation
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Practice PPDT, TAT, WAT & SRT with real-time feedback from an AI assessor.
          </p>
          <p className="text-base text-primary font-medium">
            Get personalized AI feedback on evaluation as per your own PIQ and OLQs.
          </p>
        </div>
  

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <Link to="/piq" className="block h-full">
            <Card className="p-5 hover:shadow-lg transition cursor-pointer h-full">
              <h3 className="text-base font-semibold mb-2">PIQ Form Filling</h3>
              <p className="text-sm text-muted-foreground">
                Fill your PIQ Form with AI based personalized feedback on TAT, WAT, SRT and Interview.
              </p>
            </Card>
          </Link>

          <Link to="/ppdt" className="block h-full">
            <Card className="p-5 hover:shadow-lg transition cursor-pointer h-full">
              <h3 className="text-base font-semibold mb-2">TAT, WAT & SRT Practice</h3>
              <p className="text-sm text-muted-foreground">
                Think fast, respond smartly as per SSB timings and get AI-based personalized feedback.
              </p>
            </Card>
          </Link>

          <Link to="/interview" className="block h-full">
            <Card className="p-5 hover:shadow-lg transition cursor-pointer h-full">
              <h3 className="text-base font-semibold mb-2">Interview</h3>
              <p className="text-sm text-muted-foreground">
                Give Mock Interviews to at least 3x Recommended Candidates.
              </p>
            </Card>
          </Link>

          <Link to="/rooms/register" className="block h-full">
            <Card className="p-5 hover:shadow-lg transition cursor-pointer h-full">
              <h3 className="text-base font-semibold mb-2">Rooms</h3>
              <p className="text-sm text-muted-foreground">
                Practice in group sessions, just like real SSB.
              </p>
            </Card>
          </Link>
        </div>
  
        {/* How It Works */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Steps */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">How It Works</h2>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary mt-1" />
              <div>
                <h3 className="font-semibold">Select a Test</h3>
                <p className="text-sm text-muted-foreground">Choose from TAT, WAT or SRT.</p>
              </div>
            </div>
  
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary mt-1" />
              <div>
                <h3 className="font-semibold">TAT | WAT | SRT</h3>
                <p className="text-sm text-muted-foreground">Complete the respective test as per SSB timings.</p>
              </div>
            </div>
  
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary mt-1" />
              <div>
                <h3 className="font-semibold">Receive Instant AI Feedback</h3>
                <p className="text-sm text-muted-foreground">Improve continuously with personalized feedback.</p>
              </div>
            </div>
          </div>
  
          {/* Illustration */}
          <div className="bg-card rounded-xl shadow-lg p-6 flex items-center justify-center">
            <img src="/Illustration/image.png" alt="How it works illustration" className="max-w-full h-auto rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
