import { useEffect, useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CreditGuardProps {
  testType: 'wat' | 'srt' | 'ppdt';
  children: React.ReactNode;
  onCreditConsumed?: () => void;
}

export function CreditGuard({ testType, children, onCreditConsumed }: CreditGuardProps) {
  const { user } = useAuth();
  const { checkCredits, consumeCredit, loading } = useCredits();
  const [canTakeTest, setCanTakeTest] = useState<boolean | null>(null);
  const [creditsLeft, setCreditsLeft] = useState(0);
  const [hasUnlimited, setHasUnlimited] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkTestAccess = async () => {
      if (!user) return;

      const result = await checkCredits(testType);
      setCanTakeTest(result.can_take_test);
      setCreditsLeft(result.credits || 0);
      setHasUnlimited(result.has_unlimited || false);
    };

    checkTestAccess();
  }, [user, testType, checkCredits]);

  const handleStartTest = async () => {
    if (!hasUnlimited) {
      const result = await consumeCredit(testType);
      if (!result.success) {
        setCanTakeTest(false);
        return;
      }
    }
    
    onCreditConsumed?.();
  };

  if (loading || canTakeTest === null) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canTakeTest) {
    const testNames = {
      wat: 'Word Association Test',
      srt: 'Situation Reaction Test',
      ppdt: 'Picture Perception Test'
    };

    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">No Credits Remaining</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have enough credits to take the {testNames[testType]}.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/subscription')}
                className="w-full"
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
              <p className="text-sm text-muted-foreground">
                Get unlimited access to all tests with AI-powered feedback
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {!hasUnlimited && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            ⚡ You have {creditsLeft} credits remaining for this test. 
            <Button 
              variant="link" 
              className="p-0 h-auto font-semibold text-yellow-700 dark:text-yellow-300"
              onClick={() => navigate('/subscription')}
            >
              Upgrade for unlimited access
            </Button>
          </p>
        </div>
      )}
      
      <div onClick={handleStartTest}>
        {children}
      </div>
    </div>
  );
}