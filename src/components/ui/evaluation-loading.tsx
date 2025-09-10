import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface EvaluationLoadingProps {
  isOpen: boolean;
  message?: string;
}

export function EvaluationLoading({ isOpen, message = "Analyzing your responses… Please wait while AI evaluates your test." }: EvaluationLoadingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Stop at 95% until actual completion
        return prev + Math.random() * 15; // Random progress increments
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Complete the progress when evaluation is done
      const timer = setTimeout(() => {
        setProgress(100);
      }, 8000); // After 8 seconds, complete to 100%

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border rounded-lg p-8 max-w-md w-full mx-4 text-center space-y-6">
        <div className="flex justify-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            ⏳ AI Evaluation in Progress
          </h3>
          <p className="text-muted-foreground text-sm">
            {message}
          </p>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round(progress)}% complete
          </p>
        </div>
      </div>
    </div>
  );
}