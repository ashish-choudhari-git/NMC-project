import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ChevronRight, 
  CheckCircle,
  LogIn,
  Plus,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  name: string;
  organizer: string;
  description: string | null;
  date: string;
  venue: string;
  category: string | null;
  poster_url: string | null;
  is_approved: boolean;
  created_by: string;
}

interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
}

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createData, setCreateData] = useState({
    name: "",
    organizer: "",
    venue: "",
    date: "",
    category: "",
    description: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // Citizens and employees can register; admins only view
  // Also handle the case where role is still loading (null) — don't block logged-in users
  const canRegister = !!user && role !== "admin";
  const canCreateEvent = !!user && role === "citizen";

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchRegistrations();
    }
  }, [user]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (data) {
      setEvents(data);
    }
  };

  const fetchRegistrations = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('user_id', user.id);
    
    if (data) {
      setRegistrations(data);
    }
  };

  const handleRegister = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to register for events.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setRegisteringEventId(eventId);

    const { error } = await supabase
      .from('event_registrations')
      .insert({
        user_id: user.id,
        event_id: eventId,
        status: 'registered',
      });

    setRegisteringEventId(null);

    if (error) {
      if (error.message.includes('duplicate')) {
        toast({
          title: "Already Registered",
          description: "You have already registered for this event.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "Registration Successful!",
      description: "You have been registered for the event.",
    });
    fetchRegistrations();
  };

  const handleUnregister = async (eventId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('event_registrations')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId);

    if (error) {
      toast({
        title: "Failed to Cancel",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Registration Cancelled",
      description: "Your registration has been cancelled.",
    });
    fetchRegistrations();
  };

  const handleCreateEvent = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to create an event.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!createData.name || !createData.organizer || !createData.venue || !createData.date) {
      toast({
        title: "Missing Fields",
        description: "Name, organizer, venue and date are required.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    const { error } = await supabase.from("events").insert({
      name: createData.name,
      organizer: createData.organizer,
      description: createData.description || null,
      venue: createData.venue,
      date: createData.date,
      category: createData.category || null,
      created_by: user.id,
      is_approved: true,
    });
    setIsCreating(false);

    if (error) {
      toast({
        title: "Create Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Event Created", description: "Your event has been published." });
    setIsCreateDialogOpen(false);
    setCreateData({ name: "", organizer: "", venue: "", date: "", category: "", description: "" });
    fetchEvents();
  };

  const isRegistered = (eventId: string) => {
    return registrations.some(r => r.event_id === eventId);
  };

  const now = new Date();
  const filteredEvents = events
    .filter(e => {
      const isUpcoming = new Date(e.date) >= now;
      if (filter === "upcoming") return isUpcoming;
      if (filter === "past") return !isUpcoming;
      return true;
    })
    .filter(e =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase()) ||
      (e.organizer || "").toLowerCase().includes(search.toLowerCase())
    );

  const upcomingCount = events.filter(e => new Date(e.date) >= now).length;

  return (
    <MainLayout showSidebar>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="nmc-icon-box-accent">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Community Events
            </h1>
            <p className="text-muted-foreground">
              Join civic and environmental events across Nagpur
            </p>
          </div>
          {canCreateEvent && (
            <Button className="nmc-btn-primary gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          )}
        </div>

        {/* Guest banner */}
        {!user && (
          <div className="nmc-card p-4 mb-6 flex items-center justify-between gap-4 border-l-4 border-primary">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Want to participate?</span>{" "}
              Login as a citizen or employee to register for events.
            </p>
            <Button size="sm" className="nmc-btn-primary gap-2 shrink-0" onClick={() => navigate("/auth")}>
              <LogIn className="w-4 h-4" />
              Login to Register
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{upcomingCount}</p>
              <p className="text-sm text-muted-foreground">Upcoming Events</p>
            </div>
          </div>
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-accent">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{registrations.length}</p>
              <p className="text-sm text-muted-foreground">My Registrations</p>
            </div>
          </div>
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">10</p>
              <p className="text-sm text-muted-foreground">Zones Covered</p>
            </div>
          </div>
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-accent">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">Weekly</p>
              <p className="text-sm text-muted-foreground">Activities</p>
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="Search events by name, venue or organizer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            {(["upcoming", "all", "past"] as const).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className={filter === f ? "nmc-btn-primary" : ""}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">
            {filter === "upcoming" ? "Upcoming Events" : filter === "past" ? "Past Events" : "All Events"}
            <span className="ml-2 text-base font-normal text-muted-foreground">({filteredEvents.length})</span>
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="nmc-card p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No Events Found</h3>
              <p className="text-muted-foreground">Try changing the filter or search query.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredEvents.map((event, index) => {
                const eventDate = new Date(event.date);
                const isPast = eventDate < now;
                const registered = isRegistered(event.id);

                return (
                  <div
                    key={event.id}
                    className={`nmc-card overflow-hidden animate-slide-up ${isPast ? "opacity-60" : ""}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Poster image */}
                    {event.poster_url && (
                      <div className="relative">
                        <img
                          src={event.poster_url}
                          alt={event.name}
                          className="w-full h-44 object-cover"
                        />
                        {isPast && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <span className="bg-white/90 text-xs font-bold px-3 py-1 rounded-full text-muted-foreground">Event Completed</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-5">
                    <div className="flex gap-4">
                      {/* Date Badge */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-primary rounded-xl flex flex-col items-center justify-center text-primary-foreground">
                          <span className="text-xl font-bold">{eventDate.getDate()}</span>
                          <span className="text-xs uppercase">
                            {eventDate.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {event.category && (
                          <Badge variant="secondary" className="mb-1 text-xs">{event.category}</Badge>
                        )}
                        <h3 className="font-display text-lg font-bold text-foreground truncate">
                          {event.name}
                        </h3>
                        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                          <p><span className="font-medium text-foreground">Organizer:</span> {event.organizer}</p>
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.venue}
                          </p>
                        </div>

                        {/* Action area */}
                        <div className="mt-3">
                          {isPast ? (
                            <Badge variant="outline" className="text-xs">Event Completed</Badge>
                          ) : !user ? (
                            // Guest: prompt to login
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => navigate("/auth")}
                            >
                              <LogIn className="w-3 h-3" />
                              Login to Register
                            </Button>
                          ) : canRegister ? (
                            // Citizen / Employee
                            registered ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-sm text-primary font-medium">
                                  <CheckCircle className="w-4 h-4" />
                                  Registered
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUnregister(event.id)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="nmc-btn-primary gap-1"
                                onClick={() => handleRegister(event.id)}
                                disabled={registeringEventId === event.id}
                              >
                                {registeringEventId === event.id ? "Registering..." : "Register"}
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            )
                          ) : null /* admin: no register button */}
                        </div>
                      </div>
                    </div>
                    </div>{/* /p-5 */}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Community Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input
                  value={createData.name}
                  onChange={(e) => setCreateData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Clean-up Drive - Dharampeth"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Organizer</Label>
                  <Input
                    value={createData.organizer}
                    onChange={(e) => setCreateData((p) => ({ ...p, organizer: e.target.value }))}
                    placeholder="Your name / group"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={createData.category}
                    onChange={(e) => setCreateData((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Cleanliness Drive / Awareness"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Venue</Label>
                  <Input
                    value={createData.venue}
                    onChange={(e) => setCreateData((p) => ({ ...p, venue: e.target.value }))}
                    placeholder="Location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={createData.date}
                    onChange={(e) => setCreateData((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={createData.description}
                  onChange={(e) => setCreateData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Add event details..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="nmc-btn-primary" onClick={handleCreateEvent} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default EventsPage;
