import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Star, 
  MapPin, 
  Calendar as CalendarIcon, 
  Clock, 
  User,
  CheckCircle,
  CreditCard,
  Video,
  IndianRupee
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { toast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Interviewer {
  id: string;
  name: string;
  age: number;
  recommendations_count: number;
  recommendation_places: string[];
  bio: string;
  image_url?: string;
  experience_years: number;
  specialization: string;
  rating: number;
}

interface InterviewSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  is_available: boolean;
}

interface InterviewRequest {
  id: string;
  interviewer_id: string;
  slot_id: string;
  status: string;
  payment_status: string;
  google_meet_link?: string;
  created_at: string;
  interviewers: Interviewer;
  interview_slots: InterviewSlot;
}

const Interview = () => {
  const { user, session } = useAuth();
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState<Interviewer | null>(null);
  const [availableSlots, setAvailableSlots] = useState<InterviewSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [myRequests, setMyRequests] = useState<InterviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Preload Razorpay on mount to avoid delay
  useEffect(() => {
    loadRazorpay();
    fetchInterviewers();
    fetchMyRequests();
  }, []);

  const fetchInterviewers = async () => {
    try {
      const { data, error } = await supabase
        .from('interviewers')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setInterviewers(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch interviewers.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_requests')
        .select(`
          *,
          interviewers (*),
          interview_slots (*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchSlots = async (interviewerId: string) => {
    try {
      const { data, error } = await supabase
        .from('interview_slots')
        .select('*')
        .eq('interviewer_id', interviewerId)
        .eq('is_available', true)
        .gte('slot_date', new Date().toISOString().split('T')[0])
        .order('slot_date')
        .order('slot_time');

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch available slots.',
        variant: 'destructive',
      });
    }
  };

  const handleInterviewerSelect = (interviewer: Interviewer) => {
    setSelectedInterviewer(interviewer);
    fetchSlots(interviewer.id);
    setSelectedDate(undefined);
    setSelectedSlot('');
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Get available time slots for selected date
  const getTimeSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableSlots.filter(slot => slot.slot_date === dateStr);
  };

  const handleBookInterview = async () => {
    if (!selectedInterviewer || !selectedSlot || !user || !session) return;

    try {
      setSubmitting(true);
      
      // Create order and ensure Razorpay is loaded in parallel
      const [orderResult] = await Promise.all([
        supabase.functions.invoke('process-interview-payment', {
          body: { 
            action: 'create-order',
            interviewerId: selectedInterviewer.id,
            slotId: selectedSlot,
            amount: 399
          },
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
        }),
        loadRazorpay(),
      ]);

      const { data: orderData, error: orderError } = orderResult as any;
      if (orderError) throw orderError;

      if (!window.Razorpay) {
        toast({
          title: 'Error',
          description: 'Razorpay SDK failed to load. Please check your internet connection.',
          variant: 'destructive',
        });
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SSB GPT - Interview Booking',
        description: `Interview with ${selectedInterviewer.name}`,
        image: '/favicon.ico',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment using Supabase client
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('process-interview-payment', {
              body: {
                action: 'verify-payment',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                interviewer_id: selectedInterviewer.id,
                slot_id: selectedSlot,
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (verifyError) throw verifyError;

            toast({
              title: 'Interview Booked Successfully! 🎉',
              description: 'Your interview has been confirmed. Check your interview details below.',
            });

            setSelectedInterviewer(null);
            setSelectedDate(undefined);
            setSelectedSlot('');
            fetchMyRequests();
          } catch (error: any) {
            toast({
              title: 'Error',
              description: `Payment verification failed: ${error.message}`,
              variant: 'destructive',
            });
          }
        },
        prefill: {
          name: user.user_metadata?.full_name || '',
          email: user.email || '',
        },
        notes: { 
          interviewer_id: selectedInterviewer.id,
          slot_id: selectedSlot,
        },
        theme: { color: '#2563eb' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': 
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const isInterviewTime = (dateStr: string | undefined, timeStr: string | undefined) => {
    if (!dateStr || !timeStr) return false;
    
    const now = new Date();
    const interviewDateTime = new Date(`${dateStr} ${timeStr}`);
    
    // Allow joining 15 minutes before the interview time
    const joinTime = new Date(interviewDateTime.getTime() - 15 * 60 * 1000);
    
    return now >= joinTime;
  };

  const getTimeUntilInterview = (dateStr: string | undefined, timeStr: string | undefined) => {
    if (!dateStr || !timeStr) return 'Time unavailable';
    
    const now = new Date();
    const interviewDateTime = new Date(`${dateStr} ${timeStr}`);
    const diffMs = interviewDateTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Interview started';
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading interviewers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Interview Portal</h1>
        <p className="text-muted-foreground mb-4">
          Connect with 3x SSB recommended candidates for personalized interview sessions
        </p>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />
            Instant booking: Pay ₹399 to book an interview with 3x recommended candidates.
          </p>
        </div>
      </div>

      {/* My Interview Requests */}
      {myRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Interview Requests</h2>
          <div className="grid gap-4">
            {myRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{request.interviewers?.name || 'Unknown Interviewer'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.interview_slots 
                            ? `${formatDate(request.interview_slots.slot_date)} at ${formatTime(request.interview_slots.slot_time)}`
                            : 'Slot details unavailable'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      {(request.status === 'approved' || request.status === 'confirmed') && request.google_meet_link && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled={!isInterviewTime(request.interview_slots?.slot_date, request.interview_slots?.slot_time)}
                          asChild={isInterviewTime(request.interview_slots?.slot_date, request.interview_slots?.slot_time)}
                        >
                          {isInterviewTime(request.interview_slots?.slot_date, request.interview_slots?.slot_time) ? (
                            <a href={request.google_meet_link} target="_blank" rel="noopener noreferrer">
                              <Video className="w-4 h-4 mr-2" />
                              Join Interview
                            </a>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              {getTimeUntilInterview(request.interview_slots?.slot_date, request.interview_slots?.slot_time)}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Interviewers */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Interviewers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {interviewers.map((interviewer) => (
            <Card key={interviewer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10" />
                </div>
                <CardTitle className="text-lg">{interviewer.name}</CardTitle>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span>Age: {interviewer.age}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{interviewer.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Recommendations ({interviewer.recommendations_count}x)</h4>
                  <div className="flex flex-wrap gap-1">
                    {interviewer.recommendation_places.map((place, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {place}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-1">Specialization</h4>
                  <p className="text-sm text-muted-foreground">{interviewer.specialization}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-1">Experience</h4>
                  <p className="text-sm text-muted-foreground">{interviewer.experience_years} years</p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      onClick={() => handleInterviewerSelect(interviewer)}
                    >
                      Book Interview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{selectedInterviewer?.name}</DialogTitle>
                      <DialogDescription>
                        Book an interview session with this experienced interviewer
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedInterviewer && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">About</h4>
                            <p className="text-sm text-muted-foreground">{selectedInterviewer.bio}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Select Date</h4>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={(date) => {setSelectedDate(date); setSelectedSlot('');}}
                                  disabled={(date) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    return date < new Date() || !availableSlots.some(slot => slot.slot_date === dateStr);
                                  }}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {selectedDate && (
                            <div>
                              <h4 className="font-semibold mb-2">Available Times</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {getTimeSlotsForDate(selectedDate).map((slot) => (
                                  <Button
                                    key={slot.id}
                                    variant={selectedSlot === slot.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedSlot(slot.id)}
                                    className="justify-center"
                                  >
                                    {formatTime(slot.slot_time)}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-primary/10 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <IndianRupee className="w-4 h-4" />
                              Interview Fee: ₹399
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Instant booking - Pay now and get your interview confirmed immediately with Google Meet link.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Button 
                            onClick={handleBookInterview}
                            disabled={!selectedSlot || submitting}
                            className="flex-1"
                          >
                            {submitting ? 'Processing...' : 'Pay & Book Interview'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Interview;