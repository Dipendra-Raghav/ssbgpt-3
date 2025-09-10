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

    // For WAT and SRT, show daily format if initial quota is exhausted
    if (testType === 'wat' || testType === 'srt') {
      const initialQuota = testType === 'wat' ? 5 : 5;
      if (currentCredits < initialQuota) {
        return `${currentCredits}/daily`;
      }
      return `${currentCredits}/${initialQuota}`;
    }

    // For PPDT, always show out of initial quota
    return `${currentCredits}/3`;
  };

  const getVariant = (currentCredits: number) => {
    if (hasActivePlan()) return 'default';
    return currentCredits === 0 ? 'destructive' : 'secondary';
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-4">
        {hasActivePlan() ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{subscription?.plan_name}</span>
            </div>
            <Badge variant="default" className="text-xs">
              Unlimited Access
            </Badge>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Image className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs">PPDT</span>
                </div>
                <Badge variant={getVariant(credits.ppdt_credits)} className="text-xs px-2 py-0">
                  {formatCredits(credits.ppdt_credits, 'ppdt')}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs">WAT</span>
                </div>
                <Badge variant={getVariant(credits.wat_credits)} className="text-xs px-2 py-0">
                  {formatCredits(credits.wat_credits, 'wat')}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs">SRT</span>
                </div>
                <Badge variant={getVariant(credits.srt_credits)} className="text-xs px-2 py-0">
                  {formatCredits(credits.srt_credits, 'srt')}
                </Badge>
              </div>
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