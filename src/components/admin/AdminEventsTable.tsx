import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Search, Trash2, Eye, Edit, Calendar, MapPin, Users, Plus, Loader2, Mail, Phone, Upload, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  name: string;
  description: string | null;
  venue: string;
  date: string;
  max_participants: number | null;
  poster_url: string | null;
  organizer: string;
  category: string | null;
  is_approved: boolean | null;
  created_at: string;
  created_by: string;
  registration_count?: number;
}

interface AdminEventsTableProps {
  onUpdate: () => void;
}

const CATEGORIES = [
  "Cleanliness Drive",
  "Tree Plantation",
  "Awareness Campaign",
  "Workshop",
  "Community Event",
];

interface RegisteredUser {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const AdminEventsTable = ({ onUpdate }: AdminEventsTableProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const [createData, setCreateData] = useState({
    name: "",
    organizer: "",
    description: "",
    venue: "",
    date: "",
    category: "",
    max_participants: 50,
    poster_url: "",
  });
  
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    venue: "",
    date: "",
    max_participants: 50,
    poster_url: "",
  });

  const [uploadingPoster, setUploadingPoster] = useState(false);
  const createPosterRef = useRef<HTMLInputElement>(null);
  const editPosterRef = useRef<HTMLInputElement>(null);

  const uploadPoster = async (
    file: File,
    onDone: (url: string) => void
  ) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Upload an image file.", variant: "destructive" }); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" }); return;
    }
    setUploadingPoster(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `events/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("complaint-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("complaint-images").getPublicUrl(path);
      onDone(data.publicUrl);
      toast({ title: "Poster uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingPoster(false);
    }
  };
  
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    // Fetch events with registration counts
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (eventsError) {
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Get registration counts for each event
    const eventsWithCounts = await Promise.all(
      (eventsData || []).map(async (event) => {
        const { count } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);
        
        return {
          ...event,
          registration_count: count || 0,
        };
      })
    );

    setEvents(eventsWithCounts);
    setLoading(false);
  };

  const fetchRegisteredUsers = async (eventId: string) => {
    setLoadingRegistrations(true);
    setRegisteredUsers([]);

    // Step 1: get registrations for this event
    const { data: regs, error } = await supabase
      .from('event_registrations')
      .select('id, user_id, status, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error || !regs || regs.length === 0) {
      setLoadingRegistrations(false);
      return;
    }

    // Step 2: fetch profiles for those user_ids
    const userIds = regs.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email, phone')
      .in('user_id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    setRegisteredUsers(
      regs.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        status: r.status,
        created_at: r.created_at,
        profile: profileMap.get(r.user_id) || null,
      }))
    );
    setLoadingRegistrations(false);
  };

  const handleCreate = async () => {
    if (!createData.name || !createData.venue || !createData.date || !createData.organizer) {
      toast({ title: "Missing Fields", description: "Name, organizer, venue, and date are required.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    const { error } = await supabase.from('events').insert({
      name: createData.name,
      organizer: createData.organizer,
      description: createData.description || null,
      venue: createData.venue,
      date: createData.date,
      category: createData.category || null,
      max_participants: createData.max_participants,
      poster_url: createData.poster_url || null,
      is_approved: true,
      created_by: (await supabase.auth.getUser()).data.user?.id || '',
    });
    setIsCreating(false);
    if (error) {
      toast({ title: "Create Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Event Created", description: "Event has been published successfully." });
    setIsCreateDialogOpen(false);
    setCreateData({ name: "", organizer: "", description: "", venue: "", date: "", category: "", max_participants: 50, poster_url: "" });
    fetchEvents();
    onUpdate();
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    // First delete all registrations
    const { error: regError } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', selectedEvent.id);

    if (regError) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete event registrations",
        variant: "destructive",
      });
      return;
    }

    // Then delete the event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', selectedEvent.id);

    if (error) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Event deleted successfully",
    });

    setIsDeleteDialogOpen(false);
    setSelectedEvent(null);
    fetchEvents();
    onUpdate();
  };

  const handleEdit = async () => {
    if (!selectedEvent) return;

    const { error } = await supabase
      .from('events')
      .update({
        name: editData.name,
        description: editData.description,
        venue: editData.venue,
        date: editData.date,
        max_participants: editData.max_participants,
        poster_url: editData.poster_url || null,
      })
      .eq('id', selectedEvent.id);

    if (error) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Event updated successfully",
    });

    setIsEditDialogOpen(false);
    fetchEvents();
    onUpdate();
  };

  const openEditDialog = (event: Event) => {
    setSelectedEvent(event);
    setEditData({
      name: event.name,
      description: event.description || '',
      venue: event.venue,
      date: event.date.split('T')[0],
      max_participants: event.max_participants || 50,
      poster_url: event.poster_url || '',
    });
    setIsEditDialogOpen(true);
  };

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isPastEvent = (date: string) => {
    return new Date(date) < new Date();
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search events by title, location, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Registrations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="flex items-start gap-3">
                    {event.poster_url && (
                      <img
                        src={event.poster_url}
                        alt={event.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{event.name}</div>
                      <div className="text-sm text-gray-500 line-clamp-2">
                        {event.description}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <div>{format(new Date(event.date), 'MMM dd, yyyy')}</div>
                      <div className="text-gray-500">{format(new Date(event.date), 'HH:mm')}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {event.venue}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {event.registration_count || 0}
                    </span>
                    <span className="text-gray-500">/ {event.max_participants}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {isPastEvent(event.date) ? (
                    <Badge variant="secondary">Completed</Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">Upcoming</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsViewDialogOpen(true);
                        fetchRegisteredUsers(event.id);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(event)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No events found matching your search
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {selectedEvent.poster_url && (
                <img
                  src={selectedEvent.poster_url}
                  alt={selectedEvent.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              <div>
                <Label className="text-gray-600">Name</Label>
                <p className="font-medium text-lg">{selectedEvent.name}</p>
              </div>
              <div>
                <Label className="text-gray-600">Description</Label>
                <p className="text-gray-700">{selectedEvent.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Date & Time</Label>
                  <p>{format(new Date(selectedEvent.date), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Venue</Label>
                  <p>{selectedEvent.venue}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Organizer</Label>
                  <p>{selectedEvent.organizer}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Capacity</Label>
                  <p>
                    {selectedEvent.registration_count || 0} / {selectedEvent.max_participants || 'Unlimited'} registered
                  </p>
                </div>
              </div>

              {/* Registered Users */}
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Registered Participants ({registeredUsers.length})
                </h4>
                {loadingRegistrations ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading registrations...
                  </div>
                ) : registeredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No registrations yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {registeredUsers.map((reg, idx) => (
                      <div key={reg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="space-y-0.5">
                          <p className="font-medium text-gray-800">
                            {idx + 1}.{" "}
                            {reg.profile?.first_name || reg.profile?.last_name
                              ? `${reg.profile.first_name || ''} ${reg.profile.last_name || ''}`.trim()
                              : `Participant ${idx + 1}`}
                          </p>
                          {reg.profile?.email && (
                            <p className="text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{reg.profile.email}
                            </p>
                          )}
                          {reg.profile?.phone && (
                            <p className="text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{reg.profile.phone}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">{reg.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Name *</Label>
                <Input
                  placeholder="Enter event name"
                  value={createData.name}
                  onChange={e => setCreateData({ ...createData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Organizer *</Label>
                <Input
                  placeholder="Organizer / department"
                  value={createData.organizer}
                  onChange={e => setCreateData({ ...createData, organizer: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date &amp; Time *</Label>
                <Input
                  type="datetime-local"
                  value={createData.date}
                  onChange={e => setCreateData({ ...createData, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select onValueChange={v => setCreateData({ ...createData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Venue *</Label>
                <Input
                  placeholder="Event venue / address"
                  value={createData.venue}
                  onChange={e => setCreateData({ ...createData, venue: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={createData.max_participants}
                  onChange={e => setCreateData({ ...createData, max_participants: parseInt(e.target.value) || 50 })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Write a short description..."
                rows={3}
                value={createData.description}
                onChange={e => setCreateData({ ...createData, description: e.target.value })}
              />
            </div>
            {/* Poster Upload */}
            <div>
              <Label>Event Poster</Label>
              <input
                type="file" accept="image/*" className="hidden" ref={createPosterRef}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPoster(f, url => setCreateData(d => ({ ...d, poster_url: url }))); }}
              />
              {createData.poster_url ? (
                <div className="relative mt-1">
                  <img src={createData.poster_url} alt="poster" className="w-full h-40 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => { setCreateData(d => ({ ...d, poster_url: "" })); if (createPosterRef.current) createPosterRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50"
                  >
                    <XIcon className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => createPosterRef.current?.click()}
                  disabled={uploadingPoster}
                  className="mt-1 w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  {uploadingPoster ? <Loader2 className="w-6 h-6 animate-spin text-green-600" /> : <Upload className="w-6 h-6 text-gray-400" />}
                  <span className="text-sm text-gray-500">{uploadingPoster ? "Uploading..." : "Click to upload poster (JPG/PNG, max 5MB)"}</span>
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreating ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</>
              ) : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Name</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={editData.date}
                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Venue</Label>
              <Input
                value={editData.venue}
                onChange={(e) => setEditData({ ...editData, venue: e.target.value })}
              />
            </div>
            <div>
              <Label>Max Participants</Label>
              <Input
                type="number"
                value={editData.max_participants}
                onChange={(e) => setEditData({ ...editData, max_participants: parseInt(e.target.value) })}
              />
            </div>
            {/* Poster Upload */}
            <div>
              <Label>Event Poster</Label>
              <input
                type="file" accept="image/*" className="hidden" ref={editPosterRef}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPoster(f, url => setEditData(d => ({ ...d, poster_url: url }))); }}
              />
              {editData.poster_url ? (
                <div className="relative mt-1">
                  <img src={editData.poster_url} alt="poster" className="w-full h-40 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => { setEditData(d => ({ ...d, poster_url: "" })); if (editPosterRef.current) editPosterRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50"
                  >
                    <XIcon className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => editPosterRef.current?.click()}
                  disabled={uploadingPoster}
                  className="mt-1 w-full border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  {uploadingPoster ? <Loader2 className="w-6 h-6 animate-spin text-green-600" /> : <Upload className="w-6 h-6 text-gray-400" />}
                  <span className="text-sm text-gray-500">{uploadingPoster ? "Uploading..." : "Click to upload poster (JPG/PNG, max 5MB)"}</span>
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-green-600 hover:bg-green-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEvent?.name}"? This will also remove all
              registrations for this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEventsTable;
