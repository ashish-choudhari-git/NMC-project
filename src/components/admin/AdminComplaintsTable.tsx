import { useEffect, useState } from "react";
import { format } from "date-fns";
import { verifyResolutionPhotos } from "@/lib/cleanScoreAI";
import {
  Search,
  Filter,
  UserPlus,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Upload,
  Eye,
  Users,
  Bot,
  ShieldAlert,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Assignment {
  id: string;
  employee_id: string;
  assigned_at: string;
  emp: { name: string; employee_id: string; job: string; zone: string } | null;
}

interface Complaint {
  id: string;
  title: string;
  status: string;
  priority: string;
  address: string;
  zone: string;
  deadline: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_photo_url: string | null;
  photo_url: string | null;
  user_id: string;
  assigned_employee_id: string | null;
  assignment_type: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  employees: { id: string; name: string; employee_id: string } | null;
  assignments?: { id: string; employee_id: string }[];
  ai_verification_status: string | null;
  ai_verification_score: number | null;
  ai_verification_reason: string | null;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  zone: string;
  job: string;
}

interface AdminComplaintsTableProps {
  onUpdate: () => void;
}

const AdminComplaintsTable = ({ onUpdate }: AdminComplaintsTableProps) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [newDeadline, setNewDeadline] = useState("");
  const [addEmployeeId, setAddEmployeeId] = useState("");
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
    fetchEmployees();
  }, []);

  const fetchComplaints = async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select(`
        *,
        employees:assigned_employee_id (id, name, employee_id),
        assignments:complaint_assignments (id, employee_id)
      `)
      .order('created_at', { ascending: false });

    if (error) console.error('fetchComplaints error:', error.message);
    setComplaints((data as any) ?? []);
    setLoading(false);
  };

  const handleDelete = async (complaintId: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) return;
    setDeletingId(complaintId);
    const { error } = await supabase.from('complaints').delete().eq('id', complaintId);
    setDeletingId(null);
    if (error) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Complaint deleted', description: 'Complaint has been permanently removed.' });
    fetchComplaints();
    onUpdate();
  };

  const handleAIVerify = async (complaint: Complaint) => {
    if (!complaint.photo_url || !complaint.resolved_photo_url) {
      toast({
        title: "Cannot Verify",
        description: "Both complaint photo and resolution photo are required for AI verification.",
        variant: "destructive",
      });
      return;
    }
    setVerifyingId(complaint.id);
    try {
      // Run NMC-CVA (Civic Vision Analyzer) — custom on-device ML algorithm
      const result = await verifyResolutionPhotos(
        complaint.photo_url,
        complaint.resolved_photo_url,
      );

      // Persist AI result to database
      await supabase.from('complaints').update({
        ai_verification_status: result.verdict === 'inconclusive' ? 'pending' : result.verdict,
        ai_verification_score: result.cleanScore,
        ai_verification_reason: result.reason,
        ai_verified_at: new Date().toISOString(),
      }).eq('id', complaint.id);

      toast({
        title: result.verdict === 'verified'
          ? '✅ AI Verified — Work Done'
          : result.verdict === 'suspicious'
          ? '⚠️ AI Suspicious — Possible Fraud'
          : '🔍 AI Inconclusive — Manual Review Needed',
        description: result.verdict === 'verified'
          ? 'Resolution photo confirms genuine civic work.'
          : 'Photos appear unchanged or duplicate. Check manually.',
        variant: result.verdict === 'verified' ? 'default' : 'destructive',
      });
      fetchComplaints();
      onUpdate();
    } catch (err: any) {
      toast({
        title: 'AI Verification Failed',
        description: err?.message ?? 'Could not analyse images. Ensure both photos are accessible.',
        variant: 'destructive',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const fetchAssignments = async (complaintId: string) => {
    setLoadingAssignments(true);
    const { data } = await supabase
      .from('complaint_assignments')
      .select(`id, employee_id, assigned_at, emp:employee_id (name, employee_id, job, zone)`)
      .eq('complaint_id', complaintId)
      .order('assigned_at');
    setCurrentAssignments((data as any) ?? []);
    setLoadingAssignments(false);
  };

  const openAssignDialog = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setAddEmployeeId("");
    setNewDeadline(complaint.deadline?.slice(0, 16) ?? "");
    setCurrentAssignments([]);
    setIsAssignDialogOpen(true);
    setLoadingAssignments(true);

    // Fetch existing manual assignments
    const { data: existing } = await supabase
      .from('complaint_assignments')
      .select(`id, employee_id, assigned_at, emp:employee_id (name, employee_id, job, zone)`)
      .eq('complaint_id', complaint.id)
      .order('assigned_at');

    const assignments = (existing as any) ?? [];

    // If no manual assignments yet but there's an auto-assigned employee,
    // insert them into complaint_assignments so the dialog shows them correctly.
    if (assignments.length === 0 && complaint.assigned_employee_id) {
      await supabase
        .from('complaint_assignments')
        .insert({ complaint_id: complaint.id, employee_id: complaint.assigned_employee_id });
      // Re-fetch after sync
      const { data: synced } = await supabase
        .from('complaint_assignments')
        .select(`id, employee_id, assigned_at, emp:employee_id (name, employee_id, job, zone)`)
        .eq('complaint_id', complaint.id)
        .order('assigned_at');
      setCurrentAssignments((synced as any) ?? []);
    } else {
      setCurrentAssignments(assignments);
    }
    setLoadingAssignments(false);
  };

  const handleAddAssignment = async () => {
    if (!selectedComplaint || !addEmployeeId) return;

    // Check for duplicate in fresh DB query (not stale state)
    const { data: existing } = await supabase
      .from('complaint_assignments')
      .select('id')
      .eq('complaint_id', selectedComplaint.id)
      .eq('employee_id', addEmployeeId)
      .maybeSingle();
    if (existing) {
      toast({ title: "Already assigned", description: "This worker is already assigned to this complaint.", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('complaint_assignments')
      .insert({ complaint_id: selectedComplaint.id, employee_id: addEmployeeId });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Only update assigned_employee_id if none is set yet; otherwise keep original
    const updatePayload: Record<string, any> = {
      assignment_type: 'manual',
      status: 'in_progress',
      ...(newDeadline ? { deadline: newDeadline } : {}),
    };
    if (!selectedComplaint.assigned_employee_id) {
      updatePayload.assigned_employee_id = addEmployeeId;
    }
    await supabase.from('complaints').update(updatePayload).eq('id', selectedComplaint.id);

    setAddEmployeeId("");
    toast({ title: "Employee Added", description: "Worker assigned successfully." });
    fetchAssignments(selectedComplaint.id);
    fetchComplaints();
    onUpdate();
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('complaint_assignments')
      .delete()
      .eq('id', assignmentId);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removed", description: "Worker removed from complaint." });
    fetchAssignments(selectedComplaint!.id);
    fetchComplaints();
    onUpdate();
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, employee_id, zone, job')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setEmployees(data);
    }
  };



  const handleStatusUpdate = async (complaintId: string, newStatus: string) => {
    const { error } = await supabase
      .from('complaints')
      .update({ status: newStatus })
      .eq('id', complaintId);

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
      description: "Status updated successfully",
    });

    fetchComplaints();
    onUpdate();
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;

    // ── AI Gate ────────────────────────────────────────────────────────────
    // If both a complaint photo AND a resolution photo are present,
    // run NMC-CVA before allowing 'resolved' status.
    if (resolvedPhotoUrl && selectedComplaint.photo_url) {
      // Step 1: Save photo, set status to pending_verification
      const { error: saveErr } = await supabase.from('complaints').update({
        status: 'pending_verification',
        resolved_photo_url: resolvedPhotoUrl,
      }).eq('id', selectedComplaint.id);

      if (saveErr) {
        toast({ title: "Save Failed", description: saveErr.message, variant: "destructive" });
        return;
      }

      setIsResolveDialogOpen(false);
      setResolvedPhotoUrl("");
      fetchComplaints();

      toast({
        title: "📸 Photo saved — Running NMC-CVA AI…",
        description: "Comparing before & after photos. Status will update automatically.",
      });

      // Step 2: Run AI comparison
      try {
        const result = await verifyResolutionPhotos(
          selectedComplaint.photo_url,
          resolvedPhotoUrl,
        );

        const isVerified = result.verdict === 'verified';
        const newStatus = isVerified ? 'resolved' : 'pending_verification';

        const { error: aiUpdateErr } = await supabase.from('complaints').update({
          status:                  newStatus,
          resolved_at:             isVerified ? new Date().toISOString() : null,
          ai_verification_status:  result.verdict === 'inconclusive' ? 'pending' : result.verdict,
          ai_verification_score:   result.cleanScore,
          ai_verification_reason:  result.reason,
          ai_verified_at:          new Date().toISOString(),
        }).eq('id', selectedComplaint.id);

        if (aiUpdateErr) {
          toast({
            title: "DB Update Failed",
            description: aiUpdateErr.message,
            variant: "destructive",
          });
        } else if (isVerified) {
          toast({
            title: "✅ NMC-CVA Verified — Marked as Resolved",
            description: "AI confirmed work was done. Complaint is now resolved.",
          });
        } else {
          toast({
            title: "⚠️ AI Suspicious — Not Resolved",
            description: "Photos appear unchanged or fraudulent. Complaint kept as Pending Verification for manual review.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        toast({
          title: "AI check failed — kept as Pending Verification",
          description: err?.message ?? "Could not analyse images. Manually verify & resolve.",
          variant: "destructive",
        });
      } finally {
        // Small delay so DB write commits before we re-fetch
        await new Promise(r => setTimeout(r, 600));
        await fetchComplaints();
        onUpdate();
      }
      return;
    }

    // ── No photo = mark resolved directly (no AI needed) ──────────────────
    const { error } = await supabase
      .from('complaints')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_photo_url: resolvedPhotoUrl || null,
      })
      .eq('id', selectedComplaint.id);

    if (error) {
      toast({ title: "Resolution Failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Complaint marked as resolved", description: "No photo provided — AI verification skipped." });
    setIsResolveDialogOpen(false);
    setResolvedPhotoUrl("");
    fetchComplaints();
    onUpdate();
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedComplaint) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${selectedComplaint.id}-resolved-${Date.now()}.${fileExt}`;
    const filePath = `${selectedComplaint.user_id}/${fileName}`;

    const { error: uploadError,data } = await supabase.storage
      .from('complaint-images')
      .upload(filePath, file);

    if (uploadError) {
      toast({
        title: "Upload Failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('complaint-images')
      .getPublicUrl(filePath);

    setResolvedPhotoUrl(urlData.publicUrl);
    setUploading(false);

    toast({
      title: "Success",
      description: "Photo uploaded successfully",
    });
  };

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.zone?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || complaint.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending_verification': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-12"><div className="w-7 h-7 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by title, address, or zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-500">{filteredComplaints.length} complaint{filteredComplaints.length !== 1 ? "s" : ""}</p>

      {/* Table */}
      <div className="nmc-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Citizen</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComplaints.map((complaint) => (
              <TableRow key={complaint.id}>
                <TableCell className="font-mono text-xs">
                  {complaint.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">{complaint.title}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {complaint.profiles?.first_name
                      ? <><div>{complaint.profiles.first_name} {complaint.profiles.last_name}</div>
                          <div className="text-gray-500 text-xs">{complaint.profiles.email}</div></>
                      : <span className="text-gray-400 font-mono text-xs">{complaint.user_id.slice(0, 8)}…</span>
                    }
                  </div>
                </TableCell>
                <TableCell>{complaint.zone || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(complaint.priority)}>
                    {complaint.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(complaint.status)}>
                      {complaint.status}
                    </Badge>
                    {complaint.ai_verification_status === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full w-fit">
                        <Bot className="w-2.5 h-2.5" /> AI ✓
                      </span>
                    )}
                    {complaint.ai_verification_status === 'suspicious' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full w-fit">
                        <ShieldAlert className="w-2.5 h-2.5" /> AI ⚠
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {complaint.assignments && complaint.assignments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full w-fit">
                        <Users className="w-3 h-3" /> {complaint.assignments.length} worker{complaint.assignments.length > 1 ? 's' : ''}
                      </span>
                      {complaint.employees && (
                        <span className="text-xs text-slate-500">{complaint.employees.name}</span>
                      )}
                    </div>
                  ) : complaint.employees ? (
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full w-fit">
                        <Users className="w-3 h-3" /> Auto-assigned
                      </span>
                      <span className="text-xs text-slate-500">{complaint.employees.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  {complaint.deadline ? (
                    <div className="text-sm">
                      <div>{format(new Date(complaint.deadline), 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(complaint.deadline), 'HH:mm')}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">No deadline</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setIsViewDialogOpen(true);
                      }}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAssignDialog(complaint)}
                      title="Manage Assignments"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    {complaint.status !== 'resolved' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        title="Mark Resolved"
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setResolvedPhotoUrl(complaint.resolved_photo_url || '');
                          setIsResolveDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {complaint.status === 'resolved' && complaint.photo_url && complaint.resolved_photo_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        title="Run AI Verification"
                        disabled={verifyingId === complaint.id}
                        onClick={() => handleAIVerify(complaint)}
                      >
                        {verifyingId === complaint.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Bot className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      title="Delete Complaint"
                      disabled={deletingId === complaint.id}
                      onClick={() => handleDelete(complaint.id)}
                    >
                      {deletingId === complaint.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>



      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Title</Label>
                  <p className="font-medium">{selectedComplaint.title}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Badge className={getStatusColor(selectedComplaint.status)}>
                    {selectedComplaint.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-600">Address</Label>
                  <p>{selectedComplaint.address}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Zone</Label>
                  <p>{selectedComplaint.zone}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Created</Label>
                  <p>{format(new Date(selectedComplaint.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Deadline</Label>
                  <p>{selectedComplaint.deadline ? format(new Date(selectedComplaint.deadline), 'PPpp') : 'Not set'}</p>
                </div>
              </div>
              {selectedComplaint.resolved_photo_url && (
                <div>
                  <Label className="text-gray-600">Resolved Photo</Label>
                  <img 
                    src={selectedComplaint.resolved_photo_url} 
                    alt="Resolved" 
                    className="mt-2 rounded-lg max-h-64 object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Dialog — multi-employee */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Assigned Workers</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">

            {/* Current assignments */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Currently Assigned</Label>
              {loadingAssignments ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : currentAssignments.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No workers assigned yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {currentAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-sm text-slate-800">{a.emp?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{a.emp?.employee_id} · {a.emp?.job} · {a.emp?.zone}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 h-7 w-7 p-0"
                        onClick={() => handleRemoveAssignment(a.id)}
                        title="Remove this worker"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new employee */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Add Another Worker</Label>
              <Select value={addEmployeeId} onValueChange={setAddEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee…" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => !currentAssignments.some((a) => a.employee_id === e.id))
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_id}) — {emp.zone} / {emp.job}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddAssignment}
                disabled={!addEmployeeId}
                className="w-full bg-green-700 hover:bg-green-800"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Add Worker
              </Button>
            </div>

            {/* Deadline update */}
            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Update Deadline (optional)</Label>
              <Input
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Resolution Photo</DialogTitle>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload the after-work photo. NMC-CVA AI will automatically compare it with the complaint photo.
              If work is verified, the complaint will be marked as <strong>Resolved</strong>.
              If suspicious, it stays <strong>Pending Verification</strong> for manual review.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Resolution Photo <span className="text-slate-400 font-normal">(required for AI verification)</span></Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="resolved-photo"
                  disabled={uploading}
                  capture="environment"
                />
                <label
                  htmlFor="resolved-photo"
                  className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Click to upload photo'}
                </label>
              </div>
              {resolvedPhotoUrl && (
                <div className="mt-2">
                  <img src={resolvedPhotoUrl} alt="Resolved" className="rounded-lg max-h-48" />
                </div>
              )}
            </div>
            <Button 
              onClick={handleResolve} 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload Photo & Run AI Verification'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminComplaintsTable;
