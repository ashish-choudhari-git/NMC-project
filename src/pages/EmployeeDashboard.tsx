import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList, CheckCircle, Clock, AlertCircle, Camera,
  Upload, X, User, MapPin, Phone, Mail, ChevronDown, ChevronUp, Eye, Bot
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { verifyResolutionPhotos } from "@/lib/cleanScoreAI";

interface Complaint {
  id: string;
  title: string;
  subcategory: string | null;
  address: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  created_at: string;
  resolved_at: string | null;
  photo_url: string | null;
  resolved_photo_url: string | null;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  job: string;
  zone: string;
  main_area: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  age: number | null;
  rating: number;
  total_ratings: number;
  is_active: boolean;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending:              { label: "Pending",           cls: "badge-pending" },
  in_progress:          { label: "In Progress",       cls: "badge-inprogress" },
  pending_verification: { label: "AI Verifying…",    cls: "text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full" },
  resolved:             { label: "Resolved",          cls: "badge-resolved" },
  rejected:             { label: "Rejected",          cls: "badge-rejected" },
};

const priorityColor: Record<string, string> = {
  low: "text-slate-500",
  medium: "text-amber-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

const EmployeeDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "resolved" | "all">("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!authLoading) {
      if (!user) return navigate("/staff-auth");
      if (role && role !== "employee") return navigate("/");
    }
  }, [user, role, authLoading]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Primary lookup: by user_id
    let { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fallback: by email (in case user_id wasn't linked yet)
    if (!emp && user.email) {
      const { data: empByEmail } = await supabase
        .from("employees")
        .select("*")
        .ilike("email", user.email)
        .maybeSingle();

      if (empByEmail) {
        emp = empByEmail;
        // Auto-fix: link user_id silently via edge function workaround
        await supabase
          .from("employees")
          .update({ user_id: user.id })
          .eq("id", empByEmail.id);
      }
    }

    if (!emp) { setLoading(false); return; }
    setEmployee(emp);

    const { data: cc } = await supabase
      .from("complaints")
      .select("id,title,subcategory,address,description,status,priority,deadline,created_at,resolved_at,photo_url,resolved_photo_url")
      .eq("assigned_employee_id", emp.id)
      .order("created_at", { ascending: false });

    if (cc) setComplaints(cc as any);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "resolved") update.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("complaints").update(update).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
    toast({ title: "Status Updated", description: `Complaint marked as ${newStatus.replace("_"," ")}` });
  };

  const handlePhotoUpload = async (complaintId: string, file: File, complaintPhotoUrl: string | null) => {
    if (!user) return;
    setUploadingId(complaintId);

    // Upload photo to storage
    const ext = file.name.split(".").pop();
    const path = `resolved/${complaintId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("complaint-images").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploadingId(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("complaint-images").getPublicUrl(path);
    const resolvedUrl = urlData.publicUrl;

    // Save photo + set pending_verification
    await supabase.from("complaints").update({
      resolved_photo_url: resolvedUrl,
      status: "pending_verification",
    }).eq("id", complaintId);

    setComplaints(prev => prev.map(c => c.id === complaintId
      ? { ...c, resolved_photo_url: resolvedUrl, status: "pending_verification" }
      : c
    ));

    toast({ title: "📸 Photo uploaded — Running AI check…", description: "NMC-CVA is comparing before & after photos." });

    // Run AI verification if complaint photo exists
    if (complaintPhotoUrl) {
      try {
        const result = await verifyResolutionPhotos(complaintPhotoUrl, resolvedUrl);
        const isVerified = result.verdict === "verified";

        await supabase.from("complaints").update({
          status:                  isVerified ? "resolved" : "pending_verification",
          resolved_at:             isVerified ? new Date().toISOString() : null,
          ai_verification_status:  result.verdict === "inconclusive" ? "pending" : result.verdict,
          ai_verification_score:   result.cleanScore,
          ai_verification_reason:  result.reason,
          ai_verified_at:          new Date().toISOString(),
        }).eq("id", complaintId);

        setComplaints(prev => prev.map(c => c.id === complaintId
          ? { ...c, status: isVerified ? "resolved" : "pending_verification", resolved_at: isVerified ? new Date().toISOString() : null }
          : c
        ));

        if (isVerified) {
          toast({ title: "✅ AI Verified — Complaint Resolved!", description: "Great work! Resolution confirmed by NMC-CVA AI." });
        } else {
          toast({
            title: "⚠️ AI Suspicious — Pending Admin Review",
            description: "Photos appear unchanged. Admin will review manually.",
            variant: "destructive",
          });
        }
      } catch {
        toast({
          title: "AI check failed — Admin will verify manually",
          description: "Photo saved. Resolution pending admin review.",
        });
      }
    } else {
      // No before-photo, just mark resolved directly
      await supabase.from("complaints").update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      }).eq("id", complaintId);
      setComplaints(prev => prev.map(c => c.id === complaintId
        ? { ...c, status: "resolved", resolved_at: new Date().toISOString() }
        : c
      ));
      toast({ title: "✅ Complaint Resolved!", description: "Resolution photo uploaded successfully." });
    }
    setUploadingId(null);
  };

  const isOverdue = (c: Complaint) =>
    c.deadline && new Date(c.deadline) < new Date() && !["resolved", "rejected"].includes(c.status);

  const filtered = complaints.filter(c => {
    if (activeTab === "active") return ["pending", "in_progress", "pending_verification"].includes(c.status);
    if (activeTab === "resolved") return c.status === "resolved";
    return true;
  });

  if (authLoading || loading) {
    return <MainLayout><div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div></MainLayout>;
  }

  if (!employee) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Employee Profile Not Found</h2>
          <p className="text-slate-500 text-sm">Your account is not linked to an employee profile. Please contact admin.</p>
        </div>
      </MainLayout>
    );
  }

  const active = complaints.filter(c => ["pending","in_progress"].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === "resolved").length;
  const overdue = complaints.filter(isOverdue).length;

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        {/* Profile Card */}
        <div className="nmc-card p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">{employee.name}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{employee.job}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{employee.zone}</span>
                {employee.main_area && <span className="text-xs text-slate-500">{employee.main_area}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-medium text-slate-700">ID: {employee.employee_id}</p>
              {employee.rating > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">★ {Number(employee.rating).toFixed(1)} ({employee.total_ratings} ratings)</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
            {employee.phone && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="w-4 h-4 text-slate-400" />{employee.phone}</div>}
            {employee.email && <div className="flex items-center gap-2 text-sm text-slate-600"><Mail className="w-4 h-4 text-slate-400" />{employee.email}</div>}
            {employee.address && <div className="flex items-center gap-2 text-sm text-slate-600 col-span-2"><MapPin className="w-4 h-4 text-slate-400" />{employee.address}</div>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Assigned", value: complaints.length, color: "text-slate-700", bg: "bg-white border border-slate-200" },
            { label: "Active", value: active, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "Resolved", value: resolved, color: "text-green-700", bg: "bg-green-50" },
            { label: "Overdue", value: overdue, color: "text-red-700", bg: "bg-red-50" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-4 text-center ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Complaints */}
        <div className="nmc-card">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-slate-400" />
              <h2 className="font-semibold text-slate-800">My Assignments</h2>
            </div>
            <div className="flex gap-1">
              {(["active","resolved","all"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${activeTab === tab ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {tab === "active" ? "Active" : tab === "resolved" ? "Resolved" : "All"}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No complaints in this view</p>
              </div>
            ) : (
              filtered.map(c => {
                const st = statusConfig[c.status] || statusConfig.pending;
                const overdueBool = isOverdue(c);
                const isExpanded = expandedId === c.id;
                return (
                  <div key={c.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={st.cls}>{st.label}</span>
                          {overdueBool && <span className="badge-overdue">OVERDUE</span>}
                          {c.priority && <span className={`text-xs font-medium ${priorityColor[c.priority] || ""}`}>{c.priority.toUpperCase()}</span>}
                        </div>
                        <h3 className="font-medium text-slate-800 text-sm">{c.title || c.subcategory || "Complaint"}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{c.address}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Filed: {new Date(c.created_at).toLocaleDateString("en-IN")}</span>
                          {c.deadline && <span className={`flex items-center gap-1 ${overdueBool ? "text-red-500 font-medium" : ""}`}>
                            <AlertCircle className="w-3 h-3" />Deadline: {new Date(c.deadline).toLocaleDateString("en-IN")}
                          </span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="nmc-btn-secondary text-xs"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          Details
                        </button>
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                        {c.description && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Description</p>
                            <p className="text-sm text-slate-700">{c.description}</p>
                          </div>
                        )}
                        {c.photo_url && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Complaint Photo</p>
                            <a href={c.photo_url} target="_blank" rel="noreferrer">
                              <img src={c.photo_url} alt="complaint" className="h-32 rounded-lg object-cover border border-slate-200" />
                            </a>
                          </div>
                        )}
                        {c.resolved_photo_url && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Resolution Photo</p>
                            <a href={c.resolved_photo_url} target="_blank" rel="noreferrer">
                              <img src={c.resolved_photo_url} alt="resolved" className="h-32 rounded-lg object-cover border border-green-200" />
                            </a>
                          </div>
                        )}

                        {/* Actions */}
                        {c.status !== "resolved" && c.status !== "rejected" && (
                          <div className="flex flex-wrap gap-2">
                            {c.status === "pending" && (
                              <button onClick={() => updateStatus(c.id, "in_progress")} className="nmc-btn-secondary text-xs">
                                Mark In Progress
                              </button>
                            )}
                            <button onClick={() => updateStatus(c.id, "resolved")} className="nmc-btn-accent text-xs">
                              <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                            </button>
                            {/* Upload resolution photo */}
                            <label className={`nmc-btn-primary text-xs cursor-pointer ${uploadingId === c.id ? "opacity-60 pointer-events-none" : ""}`}>
                              {uploadingId === c.id ? (
                                <span className="flex items-center gap-1"><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading & AI checking...</span>
                              ) : (
                                <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Upload Resolution Photo</span>
                              )}
                              <input
                                ref={el => { fileRefs.current[c.id] = el; }}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (f) await handlePhotoUpload(c.id, f, c.photo_url);
                                }}
                              />
                            </label>
                          </div>
                        )}
                        {c.status === "resolved" && !c.resolved_photo_url && (
                          <label className={`nmc-btn-secondary text-xs cursor-pointer border border-slate-200 ${uploadingId === c.id ? "opacity-60 pointer-events-none" : ""}`}>
                            <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Add Resolution Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (f) await handlePhotoUpload(c.id, f, c.photo_url);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeDashboard;
