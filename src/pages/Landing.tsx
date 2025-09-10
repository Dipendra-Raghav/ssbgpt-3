import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            AI-powered SSB Test Preparation
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Practice PPDT, TAT, WAT & SRT with real-time feedback from an AI assessor.
          </p>
          <p className="text-base text-primary font-medium mb-8">
            Get personalized AI feedback on evaluation as per your own PIQ and OLQs.
          </p>
          
          {/* CTA Button */}
          <Link to="/auth">
            <Button size="lg" className="shadow-lg">
              Continue to Login
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <Card className="p-5 hover:shadow-lg transition h-full">
            <h3 className="text-base font-semibold mb-2">PIQ Form Filling</h3>
            <p className="text-sm text-muted-foreground">
              Fill your PIQ Form with AI based personalized feedback on TAT, WAT, SRT and Interview.
            </p>
          </Card>

          <Card className="p-5 hover:shadow-lg transition h-full">
            <h3 className="text-base font-semibold mb-2">TAT, WAT & SRT Practice</h3>
            <p className="text-sm text-muted-foreground">
              Think fast, respond smartly as per SSB timings and get AI-based personalized feedback.
            </p>
          </Card>

          <Card className="p-5 hover:shadow-lg transition h-full">
            <h3 className="text-base font-semibold mb-2">Interview</h3>
            <p className="text-sm text-muted-foreground">
              Give Mock Interviews to at least 3x Recommended Candidates.
            </p>
          </Card>

          <Card className="p-5 hover:shadow-lg transition h-full">
            <h3 className="text-base font-semibold mb-2">Rooms</h3>
            <p className="text-sm text-muted-foreground">
              Practice in group sessions, just like real SSB.
            </p>
          </Card>
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

export default Landing;