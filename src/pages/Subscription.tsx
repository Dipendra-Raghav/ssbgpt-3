import React, { useEffect, useState } from 'react';
import { Shield, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const subscriptionPlans = [
  {
    id: 'cadet',
    name: 'Cadet',
    price: 'Free',
    originalPrice: null,
    savings: null,
    duration: '',
    badge: null,
    starCount: 1,
    features: [
      'Signup – 10 WAT, 10 SRT, 2 PPDT free',
      'No daily free WAT or SRT',
      'Limited Room Access'
    ]
  },
  {
    id: 'lieutenant',
    name: 'Lieutenant',
    price: '₹299',
    originalPrice: '₹349',
    savings: '14% OFF',
    duration: 'per month',
    badge: null,
    starCount: 2,
    features: [
      'Unlimited WAT, SRT and PPDT',
      'Early Access to Rooms'
    ]
  },
  {
    id: 'major',
    name: 'Major',
    price: '₹749',
    originalPrice: '₹999',
    savings: '25% OFF',
    duration: '3 months',
    badge: 'BEST VALUE',
    starCount: 3,
    features: [
      'Unlimited WAT, SRT and PPDT',
      'Early Access to Rooms',
      'Private Rooms Access'
    ]
  },
  {
    id: 'brigadier',
    name: 'Brigadier',
    price: '₹1299',
    originalPrice: '₹2100',
    savings: '38% OFF',
    duration: '6 months',
    badge: 'POPULAR',
    starCount: 4,
    features: [
      'Unlimited WAT, SRT and PPDT',
      'Early Access to Rooms',
      'Private Rooms Access'
    ]
  },
  {
    id: 'general',
    name: 'General',
    price: '₹2499',
    originalPrice: '₹4199',
    savings: '40% OFF',
    duration: '12 months',
    badge: 'PREMIUM',
    starCount: 5,
    features: [
      'Unlimited WAT, SRT and PPDT',
      'Early Access to Rooms',
      'Private Rooms Access',
      '1 Mock Interview with 3x Recommended Candidate'
    ]
  }
];

const ShieldIcon = ({ starCount }: { starCount: number }) => {
  return (
    <div className="relative w-16 h-16 mx-auto mb-4">
      <Shield className="w-16 h-16 text-foreground" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex gap-0.5">
          {Array.from({ length: starCount }, (_, i) => (
            <Star key={i} className="w-2 h-2 fill-foreground text-foreground" />
          ))}
        </div>
      </div>
    </div>
  );
  };

const Subscription = () => {
  const { user, session } = useAuth();
  const { subscription, hasActivePlan, fetchSubscription } = useSubscription();

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Preload Razorpay on mount to avoid delay
  useEffect(() => {
    loadRazorpay();
  }, []);

  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);

  const handlePayment = async (planId: string, planName: string) => {
    if (!user || !session) {
      toast.error('Please login to subscribe');
      return;
    }

    setPayingPlanId(planId);
    try {
      // Create subscription order and ensure Razorpay is loaded in parallel
      const [orderResult] = await Promise.all([
        supabaseClient.functions.invoke('create-subscription', {
          body: { planId, planName },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        loadRazorpay(),
      ]);

      const { data: orderData, error: orderError } = orderResult as any;
      if (orderError) throw orderError;

      if (!window.Razorpay) {
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SSB GPT',
        description: `${planName} Subscription`,
        image: '/favicon.ico',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const { data: verifyData, error: verifyError } = await supabaseClient.functions.invoke('verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (verifyError) throw verifyError;

            toast.success('Subscription activated successfully! 🎉');
            // Fetch latest subscription data instead of reloading the page
            await fetchSubscription();
          } catch (error: any) {
            toast.error(`Payment verification failed: ${error.message}`);
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
        },
        notes: { plan: planId, planName: planName },
        theme: { color: '#2563eb' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      toast.error(`Failed to create subscription: ${error.message}`);
    } finally {
      setPayingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Early Bird Banner */}
        <div className="text-center mb-8 p-3 bg-yellow-500/10 border border-yellow-500 text-yellow-500 rounded-lg text-sm">
          ⚡ Early Bird Offer: Prices may go up soon. We charge only to keep this website running — every extra penny goes back into the community.
        </div>


        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-foreground" />
            <h1 className="text-4xl font-bold tracking-wider">SUBSCRIPTION</h1>
          </div>
        </div>

        {/* Pricing Cards - 3-2 Layout */}
        <div className="space-y-8">
          {/* Top Row - First 3 Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptionPlans.slice(0, 3).map((plan) => (
              <Card key={plan.id} className="relative flex flex-col border-border bg-card hover:bg-card/80 transition-all duration-300">
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1">
                    {plan.badge}
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <ShieldIcon starCount={plan.starCount} />
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>

                  <div className="mt-4">
                    <div className="text-3xl font-bold">{plan.price}</div>
                    {plan.originalPrice && (
                      <div className="text-sm text-muted-foreground line-through">
                        {plan.originalPrice}
                      </div>
                    )}
                    {plan.duration && (
                      <div className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 mt-1 rounded inline-block">
                        {plan.duration}
                      </div>
                    )}
                    {plan.savings && (
                      <div className="text-sm text-green-500 font-medium mt-1">
                        {plan.savings}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col flex-grow justify-between space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.id !== 'cadet' && (
                    hasActivePlan() ? (
                      <Button variant="outline" className="w-full mt-6" disabled>
                        {subscription?.plan_name === plan.name ? 'Current Plan' : 'Choose Plan'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => handlePayment(plan.id, plan.name)}
                        disabled={payingPlanId === plan.id}
                      >
                        {payingPlanId === plan.id ? 'Opening Razorpay…' : 'Choose Plan'}
                      </Button>
                    )
                  )}

                  {plan.id === 'cadet' && !hasActivePlan() && (
                    <Button variant="secondary" className="w-full mt-6" disabled>
                      Current Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom Row - Last 2 Plans (Premium) */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              {subscriptionPlans.slice(3).map((plan) => (
                <Card key={plan.id} className="relative flex flex-col border-border bg-card hover:bg-card/80 transition-all duration-300 ring-2 ring-primary/20">
                  {plan.badge && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1">
                      {plan.badge}
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-4">
                    <ShieldIcon starCount={plan.starCount} />
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>

                    <div className="mt-4">
                      <div className="text-3xl font-bold">{plan.price}</div>
                      {plan.originalPrice && (
                        <div className="text-sm text-muted-foreground line-through">
                          {plan.originalPrice}
                        </div>
                      )}
                      {plan.duration && (
                        <div className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 mt-1 rounded inline-block">
                          {plan.duration}
                        </div>
                      )}
                      {plan.savings && (
                        <div className="text-sm text-green-500 font-medium mt-1">
                          {plan.savings}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {plan.id !== 'cadet' && (
                      hasActivePlan() ? (
                        <Button variant="outline" className="w-full mt-6" disabled>
                          {subscription?.plan_name === plan.name ? 'Current Plan' : 'Choose Plan'}
                        </Button>
                      ) : (
                        <Button
                          className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handlePayment(plan.id, plan.name)}
                          disabled={payingPlanId === plan.id}
                        >
                          {payingPlanId === plan.id ? 'Opening Razorpay…' : 'Choose Plan'}
                        </Button>
                      )
                    )}

                    {plan.id === 'cadet' && !hasActivePlan() && (
                      <Button variant="secondary" className="w-full mt-6" disabled>
                        Current Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-muted-foreground">
          <p className="text-sm">All plans include our core AI-powered assessment tools and personalized feedback.</p>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
