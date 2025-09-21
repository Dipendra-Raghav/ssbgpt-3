
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, Clock, UserCheck, ExternalLink, Video, Mic, CheckCircle, Circle, FileText, Download } from "lucide-react";
import { format } from "date-fns";

interface RoomDetails {
  id: string;
  title: string;
  description: string;
  room_type: string;
  scheduled_datetime: string;
  duration_minutes: number;
  mod_name: string;
  mod_email: string;
  google_meet_link: string;
  room_image_url: string;
  room_file_url: string;
  participant_count: number;
}

const RoomSession = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [checklistItems, setChecklistItems] = useState({
    camera: false,
    microphone: false,
    browser: true,
    network: true
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails();
      checkEnrollment();
    }
  }, [roomId]);

  useEffect(() => {
    if (room) {
      updateMeetingStatus();
      const interval = setInterval(updateMeetingStatus, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [room]);

  const updateMeetingStatus = () => {
    if (!room) return;
    
    const now = new Date();
    const scheduledTime = new Date(room.scheduled_datetime);
    const endTime = new Date(scheduledTime.getTime() + room.duration_minutes * 60000);
    
    if (now < scheduledTime) {
      setMeetingStatus('waiting');
    } else if (now >= scheduledTime && now < endTime) {
      setMeetingStatus('active');
    } else {
      setMeetingStatus('ended');
    }
  };

  const fetchRoomDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Error",
          description: "Room not found",
          variant: "destructive",
        });
        navigate('/rooms/join');
        return;
      }

      // Get participant count
      const { count } = await supabase
        .from('room_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      setRoom({
        ...data,
        participant_count: count || 0
      });
    } catch (error) {
      console.error('Error fetching room details:', error);
      toast({
        title: "Error",
        description: "Failed to load room details",
        variant: "destructive",
      });
      navigate('/rooms/join');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const { data, error } = await supabase
        .from('room_enrollments')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setIsEnrolled(!!data);
      
      if (!data) {
        toast({
          title: "Access Denied",
          description: "You are not enrolled in this room",
          variant: "destructive",
        });
        navigate('/rooms/join');
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
      navigate('/rooms/join');
    }
  };

  const handleJoinMeeting = () => {
    if (room?.google_meet_link) {
      // Open in a dedicated window with optimal dimensions
      const width = 1200;
      const height = 800;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      
      window.open(
        room.google_meet_link, 
        'GoogleMeetSession', 
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
      );
    }
  };

  const toggleChecklistItem = (item: keyof typeof checklistItems) => {
    setChecklistItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const getMeetingStatusColor = () => {
    switch (meetingStatus) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMeetingStatusText = () => {
    switch (meetingStatus) {
      case 'waiting':
        return 'Waiting to Start';
      case 'active':
        return 'Live Now';
      case 'ended':
        return 'Ended';
      default:
        return 'Unknown';
    }
  };

  const formatRoomType = (type: string) => {
    switch (type) {
      case 'ppdt_discussion':
        return 'PPDT Discussion';
      case 'gd':
        return 'Group Discussion';
      case 'lecturate':
        return 'Lecturate';
      default:
        return type;
    }
  };

  const getRoomTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'ppdt_discussion':
        return 'bg-blue-100 text-blue-800';
      case 'gd':
        return 'bg-green-100 text-green-800';
      case 'lecturate':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || !room) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/rooms/join')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </Button>
        
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold text-foreground">{room.title}</h1>
          <Badge className={getRoomTypeBadgeColor(room.room_type)}>
            {formatRoomType(room.room_type)}
          </Badge>
          <Badge className={getMeetingStatusColor()}>
            {getMeetingStatusText()}
          </Badge>
        </div>
        <p className="text-muted-foreground">{room.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Details */}
        <Card>
          <CardHeader>
            <CardTitle>Room Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <img
              src={room.room_image_url || '/placeholder.svg'}
              alt={room.title}
              className="w-full h-48 object-cover rounded-lg"
            />
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div>{format(new Date(room.scheduled_datetime), 'PPP')}</div>
                  <div className="text-muted-foreground">
                    {format(new Date(room.scheduled_datetime), 'p')} 
                    ({room.duration_minutes} minutes)
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div>Moderator: {room.mod_name}</div>
                  {room.mod_email && (
                    <div className="text-muted-foreground">{room.mod_email}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{room.participant_count} participants</span>
              </div>
            </div>

            {/* Room File Section */}
            {room.room_file_url && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Room Material
                </h4>
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Discussion Material</p>
                        <p className="text-xs text-muted-foreground">
                          Shared by moderator for this session
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(room.room_file_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = room.room_file_url;
                          link.download = 'room-material';
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meeting Hub */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Hub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Join Meeting Button */}
            <div className="text-center">
              <Button 
                onClick={handleJoinMeeting}
                className="w-full h-16 text-lg"
                disabled={meetingStatus === 'ended'}
                variant={meetingStatus === 'active' ? 'default' : 'outline'}
              >
                <ExternalLink className="h-6 w-6 mr-2" />
                {meetingStatus === 'active' ? 'Join Live Meeting' : 
                 meetingStatus === 'waiting' ? 'Join Meeting (Opens When Ready)' : 
                 'Meeting Ended'}
              </Button>
            </div>

            {/* Pre-meeting Checklist */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Meeting Preparation</h4>
              <div className="space-y-2">
                <div 
                  className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleChecklistItem('camera')}
                >
                  {checklistItems.camera ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  }
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Camera ready</span>
                </div>
                
                <div 
                  className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleChecklistItem('microphone')}
                >
                  {checklistItems.microphone ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  }
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Microphone ready</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded border opacity-75">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Browser compatible</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 rounded border opacity-75">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Network connection stable</span>
                </div>
              </div>
            </div>

            {/* Meeting Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Meeting Notes</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• The meeting will open in a new dedicated window</li>
                <li>• Please allow camera and microphone permissions</li>
                <li>• Join a few minutes early to test your setup</li>
                <li>• Contact the moderator if you experience issues</li>
              </ul>
            </div>

            {/* Meeting Status Details */}
            {meetingStatus === 'waiting' && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Meeting starts {format(new Date(room.scheduled_datetime), 'p')}. 
                  You can join when the moderator starts the session.
                </p>
              </div>
            )}

            {meetingStatus === 'active' && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  Meeting is live! Click the join button above to participate.
                </p>
              </div>
            )}

            {meetingStatus === 'ended' && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">
                  This meeting has ended. Thank you for participating!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoomSession;
