import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Zap, Target, Eye } from 'lucide-react';

export function CreditsDisplay() {
  const { credits, loading } = useCredits();

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credits) {
    return null;
  }

  if (credits.has_unlimited) {
    return (
      <Card className="w-full border-gradient-to-r from-primary to-primary-foreground">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">Premium Access</span>
            </div>
            <Badge variant="secondary" className="bg-primary text-primary-foreground">
              Unlimited
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">WAT</span>
            </div>
            <Badge variant={credits.wat_credits > 0 ? "default" : "destructive"}>
              {credits.wat_credits}
            </Badge>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">SRT</span>
            </div>
            <Badge variant={credits.srt_credits > 0 ? "default" : "destructive"}>
              {credits.srt_credits}
            </Badge>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 mb-1">
              <Eye className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">PPDT</span>
            </div>
            <Badge variant={credits.ppdt_credits > 0 ? "default" : "destructive"}>
              {credits.ppdt_credits}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}