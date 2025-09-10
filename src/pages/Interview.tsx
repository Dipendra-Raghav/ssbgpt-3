import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Star, 
  MapPin, 
  Calendar, 
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
  const { user } = useAuth();
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState<Interviewer | null>(null);
  const [availableSlots, setAvailableSlots] = useState<InterviewSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [myRequests, setMyRequests] = useState<InterviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
    setSelectedSlot('');
  };

  const handleRequestInterview = async () => {
    if (!selectedInterviewer || !selectedSlot) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('interview_requests')
        .insert({
          user_id: user?.id,
          interviewer_id: selectedInterviewer.id,
          slot_id: selectedSlot,
          status: 'pending',
          payment_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Your interview request has been submitted. You will be notified once approved.',
      });

      setSelectedInterviewer(null);
      setSelectedSlot('');
      fetchMyRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit interview request.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (requestId: string) => {
    // In a real app, this would integrate with Stripe for payment
    toast({
      title: 'Payment Integration',
      description: 'Payment integration will be implemented with Stripe API.',
    });
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
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
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
            You have to pay ₹299 to give an interview with 3x recommended candidates.
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
                        <h3 className="font-semibold">{request.interviewers.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(request.interview_slots.slot_date)} at {formatTime(request.interview_slots.slot_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      {request.status === 'approved' && request.payment_status === 'pending' && (
                        <Button size="sm" onClick={() => handlePayment(request.id)}>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay ₹299
                        </Button>
                      )}
                      {request.status === 'approved' && request.payment_status === 'paid' && request.google_meet_link && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={request.google_meet_link} target="_blank" rel="noopener noreferrer">
                            <Video className="w-4 h-4 mr-2" />
                            Join Interview
                          </a>
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
                            <h4 className="font-semibold mb-2">Available Slots</h4>
                            <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an available time slot" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSlots.map((slot) => (
                                  <SelectItem key={slot.id} value={slot.id}>
                                    {formatDate(slot.slot_date)} at {formatTime(slot.slot_time)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <IndianRupee className="w-4 h-4" />
                              Interview Fee: ₹299
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Payment will be required after your request is approved by the interviewer.
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <Button 
                            onClick={handleRequestInterview}
                            disabled={!selectedSlot || submitting}
                            className="flex-1"
                          >
                            {submitting ? 'Submitting...' : 'Request Interview'}
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