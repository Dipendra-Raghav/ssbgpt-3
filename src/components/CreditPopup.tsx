import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CreditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  testType: 'wat' | 'srt' | 'ppdt';
  creditsLeft: number;
}

export function CreditPopup({ isOpen, onClose, testType, creditsLeft }: CreditPopupProps) {
  const navigate = useNavigate();

  const testNames = {
    wat: 'Word Association Test',
    srt: 'Situation Reaction Test',
    ppdt: 'Picture Perception Test'
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            Insufficient Credits
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You need credits to take the {testNames[testType]}. You currently have {creditsLeft} credits remaining for this test.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleUpgrade}
            className="w-full"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
          <AlertDialogAction onClick={onClose} className="w-full">
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}