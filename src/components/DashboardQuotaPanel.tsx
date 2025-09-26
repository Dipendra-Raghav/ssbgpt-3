import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Target, Image } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardQuotaPanel() {
  const { credits, loading: creditsLoading } = useCredits();
  const { subscription, loading: subscriptionLoading, hasActivePlan } = useSubscription();
  const navigate = useNavigate();

  if (creditsLoading || subscriptionLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credits) return null;

  const formatCredits = (currentCredits: number, testType: 'wat' | 'srt' | 'ppdt') => {
    if (hasActivePlan()) {
      return 'Unlimited';
    }

    // Show current credits out of initial quota based on new system
    const initialQuota = testType === 'wat' ? 10 : testType === 'srt' ? 10 : 2;
    return `${currentCredits}/${initialQuota}`;
  };

  const getVariant = (currentCredits: number) => {
    if (hasActivePlan()) return 'default';
    return currentCredits === 0 ? 'destructive' : 'secondary';
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          Quota & Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {hasActivePlan() ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">{subscription?.plan_name || 'Premium Plan'}</div>
            <Badge variant="default" className="text-xs">
              Unlimited Access
            </Badge>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">Cadet Free Plan</div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Image className="w-3 h-3 text-muted-foreground" />
                <span>PPDT:</span>
              </div>
              <Badge variant={getVariant(credits.ppdt_credits)} className="text-xs px-2 py-0">
                {formatCredits(credits.ppdt_credits, 'ppdt')} remaining
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-muted-foreground" />
                <span>WAT:</span>
              </div>
              <Badge variant={getVariant(credits.wat_credits)} className="text-xs px-2 py-0">
                {formatCredits(credits.wat_credits, 'wat')} remaining
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 text-muted-foreground" />
                <span>SRT:</span>
              </div>
              <Badge variant={getVariant(credits.srt_credits)} className="text-xs px-2 py-0">
                {formatCredits(credits.srt_credits, 'srt')} remaining
              </Badge>
            </div>
            
            {(credits.wat_credits === 0 || credits.srt_credits === 0 || credits.ppdt_credits === 0) && (
              <Button 
                onClick={() => navigate('/subscription')}
                className="w-full mt-2"
                size="sm"
                variant="outline"
              >
                <Crown className="w-3 h-3 mr-1" />
                <span className="text-xs">Upgrade</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}