import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, CheckCircle, Mail, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { toast } from '@/hooks/use-toast';

const Feedback = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your feedback before submitting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id,
          message: feedback.trim(),
        });

      if (error) throw error;

      setIsSubmitted(true);
      setFeedback('');
      
      toast({
        title: 'Success',
        description: 'Thank you for your feedback! We\'ll review it shortly.',
      });

      setTimeout(() => setIsSubmitted(false), 3000);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-2">Feedback</h1>
        <p className="text-lg text-muted-foreground">
          Help us improve <span className="font-semibold text-primary">SSBGPT</span> by sharing your thoughts and suggestions
        </p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Feedback Form */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="w-5 h-5 text-primary" />
                Share Your Feedback
              </CardTitle>
              <CardDescription>
                Tell us about your experience, report issues, or suggest new features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">Your Message</Label>
                <Textarea
                  id="feedback"
                  placeholder="We'd love to hear your thoughts about SSBGPT. What's working well? What could be improved? Any bugs you've encountered? Feature suggestions?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={8}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground text-right">
                  {feedback.length}/1000 characters
                </p>
              </div>
              
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center p-6 rounded-lg border bg-muted/50">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                  <h3 className="text-lg font-semibold text-green-400">Feedback Submitted!</h3>
                  <p className="text-sm text-muted-foreground">
                    Thank you for helping us improve SSBGPT
                  </p>
                </div>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !feedback.trim()}
                  className="w-full flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feedback Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-muted-foreground">
              <div>
                <h4 className="font-semibold mb-2 text-foreground">What to Include:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Specific issues or bugs you've encountered</li>
                  <li>Features you'd like to see added</li>
                  <li>Areas where the app could be improved</li>
                  <li>Your overall experience using SSBGPT</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-foreground">Tips for Good Feedback:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Be specific about issues</li>
                  <li>Include steps to reproduce problems</li>
                  <li>Suggest solutions when possible</li>
                  <li>Be constructive and respectful</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                For urgent technical issues or account problems, you can also contact us directly.
              </p>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" /> Email Support
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <HelpCircle className="w-4 h-4 mr-2" /> Help Center
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
