import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, Users, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface Room {
  id: string;
  title: string;
  description: string;
  room_type: string;
  scheduled_datetime: string;
  duration_minutes: number;
  mod_name: string;
  room_image_url: string;
  max_participants: number;
  is_enrolled?: boolean;
  participant_count?: number;
}

const RoomRegister = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingRoomId, setEnrollingRoomId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      
      // Fetch all active rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .gte('scheduled_datetime', new Date().toISOString())
        .order('scheduled_datetime', { ascending: true });

      if (roomsError) throw roomsError;

      // Fetch user's enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('room_enrollments')
        .select('room_id')
        .eq('user_id', user?.id);

      if (enrollmentsError) throw enrollmentsError;

      const enrolledRoomIds = new Set(enrollments?.map(e => e.room_id) || []);

      // Fetch participant counts for each room
      const roomsWithEnrollmentStatus = await Promise.all(
        (roomsData || []).map(async (room) => {
          const { count } = await supabase
            .from('room_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);

          return {
            ...room,
            is_enrolled: enrolledRoomIds.has(room.id),
            participant_count: count || 0
          };
        })
      );

      setRooms(roomsWithEnrollmentStatus);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = async (roomId: string, isEnrolled: boolean) => {
    try {
      setEnrollingRoomId(roomId);

      if (isEnrolled) {
        // Unenroll
        const { error } = await supabase
          .from('room_enrollments')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: "Unenrolled",
          description: "You have been unenrolled from the room",
        });
      } else {
        // Enroll
        const { error } = await supabase
          .from('room_enrollments')
          .insert({
            room_id: roomId,
            user_id: user?.id
          });

        if (error) throw error;

        toast({
          title: "Enrolled",
          description: "You have been enrolled in the room",
        });
      }

      await fetchRooms();
    } catch (error) {
      console.error('Error with enrollment:', error);
      toast({
        title: "Error",
        description: "Failed to update enrollment",
        variant: "destructive",
      });
    } finally {
      setEnrollingRoomId(null);
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
          {[...Array(6)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-foreground">Room Registration</h1>
        <p className="text-muted-foreground mt-2">
          Browse and register for upcoming discussion rooms and lectures
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
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
                  <span>{room.participant_count}/{room.max_participants} participants</span>
                </div>
              </div>

              <Button
                onClick={() => handleEnrollment(room.id, room.is_enrolled || false)}
                disabled={
                  enrollingRoomId === room.id || 
                  (!room.is_enrolled && (room.participant_count || 0) >= room.max_participants)
                }
                variant={room.is_enrolled ? "secondary" : "default"}
                className="w-full"
              >
                {enrollingRoomId === room.id ? (
                  "Processing..."
                ) : room.is_enrolled ? (
                  "Unenroll"
                ) : (room.participant_count || 0) >= room.max_participants ? (
                  "Room Full"
                ) : (
                  "Enroll"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {rooms.length === 0 && !loading && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">
            No upcoming rooms available
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Check back later for new room sessions
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomRegister;