import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, CheckCircle } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface EventRegistration {
  id: string;
  event_id: string;
  status: string;
  created_at: string;
  events: {
    id: string;
    name: string;
    organizer: string;
    date: string;
    venue: string;
    category: string | null;
  };
}

const MyEventsPage = () => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRegistrations();
    }
  }, [user]);

  const fetchRegistrations = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('event_registrations')
      .select(`
        *,
        events (
          id,
          name,
          organizer,
          date,
          venue,
          category
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setRegistrations(data as unknown as EventRegistration[]);
    }
    setLoading(false);
  };

  const handleUnregister = async (eventId: string) => {
    if (!user) return;

    await supabase
      .from('event_registrations')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);

    fetchRegistrations();
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  const upcomingEvents = registrations.filter(
    r => r.events && new Date(r.events.date) >= new Date()
  );
  const pastEvents = registrations.filter(
    r => r.events && new Date(r.events.date) < new Date()
  );

  return (
    <MainLayout showSidebar>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="nmc-icon-box-accent">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                My Events
              </h1>
              <p className="text-muted-foreground">
                Events you've registered for
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/events")} className="nmc-btn-primary">
            Browse Events
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="nmc-stat-card">
            <p className="text-2xl font-bold text-foreground">{registrations.length}</p>
            <p className="text-sm text-muted-foreground">Total Registrations</p>
          </div>
          <div className="nmc-stat-card">
            <p className="text-2xl font-bold text-primary">{upcomingEvents.length}</p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </div>
          <div className="nmc-stat-card">
            <p className="text-2xl font-bold text-muted-foreground">{pastEvents.length}</p>
            <p className="text-sm text-muted-foreground">Past Events</p>
          </div>
        </div>

        {/* Events List */}
        {registrations.length === 0 ? (
          <div className="nmc-card p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Event Registrations</h3>
            <p className="text-muted-foreground mb-4">
              You haven't registered for any events yet.
            </p>
            <Button onClick={() => navigate("/events")} className="nmc-btn-primary">
              Browse Events
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-4">
                  Upcoming Events
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {upcomingEvents.map((reg, index) => {
                    const eventDate = new Date(reg.events.date);
                    return (
                      <div
                        key={reg.id}
                        className="nmc-card p-6 animate-slide-up"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 bg-primary rounded-xl flex flex-col items-center justify-center text-primary-foreground">
                              <span className="text-lg font-bold">
                                {eventDate.getDate()}
                              </span>
                              <span className="text-xs uppercase">
                                {eventDate.toLocaleDateString("en-US", { month: "short" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-primary" />
                              <span className="text-xs text-primary font-medium">Registered</span>
                            </div>
                            <h3 className="font-semibold text-foreground truncate">
                              {reg.events.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {reg.events.organizer}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {reg.events.venue}
                            </p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-3"
                              onClick={() => handleUnregister(reg.event_id)}
                            >
                              Cancel Registration
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-bold text-foreground mb-4">
                  Past Events
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {pastEvents.map((reg, index) => {
                    const eventDate = new Date(reg.events.date);
                    return (
                      <div
                        key={reg.id}
                        className="nmc-card p-6 opacity-60"
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 bg-muted rounded-xl flex flex-col items-center justify-center text-muted-foreground">
                              <span className="text-lg font-bold">
                                {eventDate.getDate()}
                              </span>
                              <span className="text-xs uppercase">
                                {eventDate.toLocaleDateString("en-US", { month: "short" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {reg.events.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {reg.events.organizer}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {reg.events.venue}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyEventsPage;
