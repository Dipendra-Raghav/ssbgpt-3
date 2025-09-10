import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Users, UserCheck, Play } from "lucide-react";
import { format, differenceInMinutes, isPast, isFuture } from "date-fns";

interface EnrolledRoom {
  id: string;
  title: string;
  description: string;
  room_type: string;
  scheduled_datetime: string;
  duration_minutes: number;
  mod_name: string;
  room_image_url: string;
  google_meet_link: string;
  participant_count?: number;
}

const RoomJoin = () => {
  const [enrolledRooms, setEnrolledRooms] = useState<EnrolledRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEnrolledRooms();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchEnrolledRooms = async () => {
    try {
      setLoading(true);
      
      const { data: enrollments, error } = await supabase
        .from('room_enrollments')
        .select(`
          room_id,
          rooms (
            id,
            title,
            description,
            room_type,
            scheduled_datetime,
            duration_minutes,
            mod_name,
            room_image_url,
            google_meet_link
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'enrolled');

      if (error) throw error;

      const roomsData = enrollments
        ?.map(enrollment => enrollment.rooms)
        .filter(room => room && new Date(room.scheduled_datetime) > new Date(Date.now() - room.duration_minutes * 60 * 1000))
        .sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime()) || [];

      // Fetch participant counts
      const roomsWithCounts = await Promise.all(
        roomsData.map(async (room) => {
          const { count } = await supabase
            .from('room_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          return {
            ...room,
            participant_count: count || 0
          };
        })
      );

      setEnrolledRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching enrolled rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load enrolled rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeToRoom = (scheduledTime: string) => {
    const roomTime = new Date(scheduledTime);
    const minutesToRoom = differenceInMinutes(roomTime, currentTime);
    
    if (minutesToRoom < 0) {
      return { status: 'live', text: 'Live Now', color: 'bg-green-100 text-green-800' };
    } else if (minutesToRoom <= 10) {
      return { status: 'joining', text: `${minutesToRoom}m to start`, color: 'bg-orange-100 text-orange-800' };
    } else {
      const hours = Math.floor(minutesToRoom / 60);
      const minutes = minutesToRoom % 60;
      const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return { status: 'waiting', text: `${timeText} to start`, color: 'bg-blue-100 text-blue-800' };
    }
  };

  const canJoinRoom = (scheduledTime: string, durationMinutes: number) => {
    const roomTime = new Date(scheduledTime);
    const minutesToRoom = differenceInMinutes(roomTime, currentTime);
    const minutesSinceStart = -minutesToRoom;
    
    // Can join 10 minutes before start and during the session
    return minutesToRoom <= 10 && minutesSinceStart < durationMinutes;
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/rooms/${roomId}/session`);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg"></div>
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Join Room</h1>
        <p className="text-muted-foreground mt-2">
          Your enrolled rooms. Join when the session begins!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrolledRooms.map((room) => {
          const timeInfo = getTimeToRoom(room.scheduled_datetime);
          const canJoin = canJoinRoom(room.scheduled_datetime, room.duration_minutes);
          
          return (
            <Card key={room.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={room.room_image_url || '/placeholder.svg'}
                  alt={room.title}
                  className="w-full h-48 object-cover"
                />
                <Badge 
                  className={`absolute top-2 right-2 ${getRoomTypeBadgeColor(room.room_type)}`}
                >
                  {formatRoomType(room.room_type)}
                </Badge>
                <Badge className={`absolute top-2 left-2 ${timeInfo.color}`}>
                  {timeInfo.text}
                </Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="text-lg">{room.title}</CardTitle>
                <CardDescription className="text-sm">
                  {room.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(room.scheduled_datetime), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(room.scheduled_datetime), 'p')} 
                      ({room.duration_minutes} minutes)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span>Moderator: {room.mod_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{room.participant_count} participants</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={!canJoin}
                  variant={canJoin ? "default" : "secondary"}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {canJoin ? "Join Room" : "Not Available Yet"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {enrolledRooms.length === 0 && !loading && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">
            No enrolled rooms
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Visit the registration page to enroll in upcoming rooms
          </p>
          <Button 
            onClick={() => navigate('/rooms/register')} 
            className="mt-4"
          >
            Browse Rooms
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoomJoin;