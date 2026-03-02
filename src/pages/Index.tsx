import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText, Calendar, MapPin, Award, Trash2, Recycle,
  CheckCircle, Clock, AlertCircle, XCircle, Users,
  ArrowRight, ChevronRight, X, User, Building2, ClipboardCheck,
  UserCheck, ShieldCheck, Leaf, Bot, ShieldAlert, Loader2, LocateFixed,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import MapView from "@/components/MapView";

interface PublicComplaint {
  id: string;
  title: string;
  subcategory: string | null;
  status: string;
  priority: string;
  address: string;
  zone: string | null;
  created_at: string;
  deadline: string | null;
  resolved_at: string | null;
  resolved_photo_url: string | null;
  photo_url: string | null;
  assigned_employee_id: string | null;
  employees: { name: string; job: string; employee_id: string } | null;
  ai_verification_status: string | null;
  ai_verification_score: number | null;
  ai_verification_reason: string | null;
  ai_verified_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface AssignedWorker {
  id: string;
  employee_id: string;
  assigned_at: string;
  emp: { name: string; job: string; zone: string; employee_id: string } | null;
}

interface Activity {
  id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; icon: React.ElementType; dot: string; step: number }> = {
  pending:              { label: "Pending",            icon: Clock,       dot: "bg-amber-400",  step: 1 },
  in_progress:          { label: "In Progress",        icon: AlertCircle, dot: "bg-blue-500",   step: 3 },
  pending_verification: { label: "AI Verifying",       icon: Loader2,     dot: "bg-purple-500", step: 3 },
  resolved:             { label: "Resolved",           icon: CheckCircle, dot: "bg-green-600",  step: 4 },
  rejected:             { label: "Rejected",           icon: XCircle,     dot: "bg-red-500",    step: 4 },
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-red-600 bg-red-50 border border-red-200",
  high:   "text-orange-600 bg-orange-50 border border-orange-200",
  medium: "text-amber-600 bg-amber-50 border border-amber-200",
  low:    "text-green-700 bg-green-50 border border-green-200",
};

// ─── Progress Stepper ────────────────────────────────────────────────────────
const ProgressStepper = ({ status }: { status: string }) => {
  const steps = ["Filed", "Assigned", "In Progress", status === "rejected" ? "Rejected" : "Resolved"];
  const step = STATUS[status]?.step ?? 1;
  const isRejected = status === "rejected";

  return (
    <div className="w-full select-none">
      {/* Single row: circle ── line ── circle ── line ── circle ── line ── circle */}
      <div className="flex items-center w-full">
        {steps.map((label, i) => {
          const active = i < step;
          const rejected = isRejected && i === 3;
          const lineActive = i < step - 1;
          const isLast = i === steps.length - 1;
          return (
            <>
              {/* Circle + label */}
              <div key={i} className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    rejected
                      ? "bg-red-500 border-red-500 text-white"
                      : active
                      ? "bg-green-700 border-green-700 text-white"
                      : "bg-white border-slate-200 text-slate-400"
                  }`}
                >
                  {active && !rejected ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1.5 whitespace-nowrap ${
                    rejected ? "text-red-500" : active ? "text-green-700" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {/* Connector line — flex-1 so all lines are equal width */}
              {!isLast && (
                <div
                  key={`line-${i}`}
                  className={`flex-1 h-0.5 mb-5 transition-all duration-500 ${
                    lineActive ? "bg-green-600" : "bg-slate-200"
                  }`}
                />
              )}
            </>
          );
        })}
      </div>
    </div>
  );
};

// ─── Timeline Item ────────────────────────────────────────────────────────────
const TimelineItem = ({ activity, isLast }: { activity: Activity; isLast: boolean }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div className="w-2.5 h-2.5 rounded-full bg-green-600 mt-1 flex-shrink-0 ring-4 ring-green-50" />
      {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
    </div>
    <div className="pb-5 flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-700 capitalize tracking-wide">
        {activity.activity_type.replace(/_/g, " ")}
      </p>
      {activity.description && (
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{activity.description}</p>
      )}
      <p className="text-[10px] text-slate-400 mt-1 font-medium">
        {new Date(activity.created_at).toLocaleString("en-IN", {
          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        })}
      </p>
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────
const Index = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<PublicComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PublicComplaint | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedWorkers, setAssignedWorkers] = useState<AssignedWorker[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");
  const [showMyLocation, setShowMyLocation] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [myLocLoading, setMyLocLoading] = useState(false);
  const [myLocError, setMyLocError] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
    const onFocus = () => fetchComplaints();
    window.addEventListener("focus", onFocus);
    const channel = supabase
      .channel("complaints-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => {
        fetchComplaints();
      })
      .subscribe();
    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("complaints")
      .select(
        `id, title, subcategory, status, priority, address, zone, created_at, deadline, resolved_at, resolved_photo_url, photo_url, assigned_employee_id, ai_verification_status, ai_verification_score, ai_verification_reason, ai_verified_at, latitude, longitude, employees:assigned_employee_id (name, job, employee_id)`
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setComplaints(data as any);
    setLoading(false);
  };

  const openDetail = async (c: PublicComplaint) => {
    setSelected(c);
    setLoadingDetail(true);
    setActivities([]);
    setAssignedWorkers([]);
    const [actRes, workersRes] = await Promise.all([
      supabase
        .from("complaint_activities")
        .select("id, activity_type, description, created_at")
        .eq("complaint_id", c.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("complaint_assignments")
        .select("id, employee_id, assigned_at, emp:employee_id (name, job, zone, employee_id)")
        .eq("complaint_id", c.id)
        .order("assigned_at"),
    ]);
    if (actRes.data) setActivities(actRes.data as any);
    if (workersRes.data) setAssignedWorkers(workersRes.data as any);
    setLoadingDetail(false);
  };

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (() => {
        const q = searchQuery.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          (c.title || "").toLowerCase().includes(q) ||
          (c.address || "").toLowerCase().includes(q) ||
          (c.zone || "").toLowerCase().includes(q)
        );
      })();
    const matchesTab =
      statusFilter === "all"
        ? true
        : statusFilter === "resolved"
        ? c.status === "resolved"
        : c.status !== "resolved";
    return matchesSearch && matchesTab;
  });

  return (
    <MainLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        
        .nmc-root { font-family: 'DM Sans', sans-serif; }
        .nmc-serif { font-family: 'DM Serif Display', serif; }
        
        /* Dot pattern background */
        .dot-pattern {
          background-image: radial-gradient(circle, #16a34a22 1px, transparent 1px);
          background-size: 24px 24px;
        }

        /* Noise texture overlay */
        .noise::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
        }

        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px -4px rgba(22, 101, 52, 0.12);
        }

        .row-hover:hover { background: #f0fdf4; }
        .row-hover { transition: background 0.15s ease; }

        .stat-card {
          border: 1px solid #e2e8f0;
          background: white;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: #bbf7d0;
          box-shadow: 0 4px 16px rgba(22, 101, 52, 0.08);
        }

        .pill-btn {
          border: 1px solid #e2e8f0;
          transition: all 0.15s ease;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.025em;
          text-transform: uppercase;
        }
        .pill-btn.active {
          background: #15803d;
          color: white;
          border-color: #15803d;
        }
        .pill-btn:not(.active):hover {
          border-color: #86efac;
          color: #15803d;
        }

        .search-input {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 0.8125rem;
          outline: none;
          transition: border-color 0.15s;
          background: white;
          font-family: 'DM Sans', sans-serif;
        }
        .search-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px #bbf7d040; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
          animation: fadeIn 0.2s ease;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .modal-overlay { align-items: center; padding: 1.5rem; }
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        .modal-panel {
          background: white;
          width: 100%;
          max-width: 1880px;
          height: 92vh;
          max-height: 92vh;
          overflow-y: auto;
          overflow-x: hidden;
          border-radius: 20px 20px 0 0;
          animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 640px) {
          .modal-panel {
            height: auto;
            max-height: 90vh;
            border-radius: 20px;
            animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes scaleIn { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .section-label {
          font-size: 0.625rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #16a34a;
        }

        .hero-bg {
          background-color: #f8fdf9;
        }
        .hero-grid {
          background-image:
            linear-gradient(rgba(22, 163, 74, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22, 163, 74, 0.06) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .step-number {
          font-family: 'DM Serif Display', serif;
          font-size: 3rem;
          color: #dcfce7;
          line-height: 1;
          position: absolute;
          top: -8px;
          right: 12px;
        }

        .overdue-badge {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .table-head {
          background: #f0fdf4;
          border-bottom: 1px solid #dcfce7;
        }
        .table-head th {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #15803d;
          padding: 10px 20px;
        }

        .worker-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #166534;
        }

        .ai-verified   { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .ai-suspicious { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .ai-pending    { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; }
      `}</style>

      <div className="nmc-root">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="hero-bg hero-grid relative overflow-hidden">
          {/* Decorative circle */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-green-100 opacity-50 pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-green-50 opacity-70 pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-24">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-green-700 text-white rounded-full px-4 py-1.5 mb-6">
                <Leaf className="w-3.5 h-3.5" />
                <span className="text-xs font-bold tracking-widest uppercase">Nagpur Municipal Corporation</span>
              </div>

              <h1 className="nmc-serif text-4xl md:text-6xl text-slate-900 leading-tight mb-4">
                Swachh Nagpur<br />
                <span className="text-green-700">Cleaner City,</span><br />
                <span className="italic text-slate-600">Better Life.</span>
              </h1>

              <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
                The NMC digital grievance portal lets every citizen report civic issues,
                track their resolution in real time, and engage with community clean-up events.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/complaint"
                  className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-green-200"
                >
                  <FileText className="w-4 h-4" />
                  File a Complaint
                </Link>
                {user ? (
                  <Link
                    to="/my-complaints"
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-green-300 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-all duration-200"
                  >
                    My Complaints
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-green-300 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-all duration-200"
                  >
                    Sign In / Register
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12">
              {([
                { icon: Leaf,          label: "City Zones",     value: "10",      color: "text-green-700", bg: "bg-green-50"  },
                { icon: Users,         label: "Field Workers",  value: "150+",    color: "text-amber-700", bg: "bg-amber-50"  },
                { icon: ClipboardCheck,label: "Live Tracking",  value: "Yes",     color: "text-purple-700",bg: "bg-purple-50" },
                { icon: ShieldCheck,   label: "Avg. Resolution",value: "3 days",  color: "text-slate-700", bg: "bg-slate-100" },
              ] as { icon: React.ElementType; label: string; value: string; color: string; bg: string }[]).map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="stat-card rounded-2xl p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-800 leading-none">{s.value}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <div className="mb-10">
            <p className="section-label mb-2">Process</p>
            <h2 className="nmc-serif text-3xl md:text-4xl text-slate-900">How It Works</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {([
              { step: "01", icon: FileText,  title: "Citizen Files a Complaint",  desc: "Select the issue type, upload a photo if needed, and submit. Takes under a minute.",                         color: "text-green-700",  bg: "bg-green-50"  },
              { step: "02", icon: UserCheck, title: "Auto-Assigned to Worker",     desc: "Our system intelligently assigns the complaint to the right field worker in your zone.",                    color: "text-amber-700",  bg: "bg-amber-50"  },
              { step: "03", icon: CheckCircle,title:"Resolved & Photo Verified",   desc: "The worker uploads a resolution photo. Track every step live on this page.",                               color: "text-purple-700", bg: "bg-purple-50" },
            ] as { step: string; icon: React.ElementType; title: string; desc: string; color: string; bg: string }[]).map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative bg-white border border-slate-100 rounded-2xl p-6 overflow-hidden card-hover">
                  <span className="step-number">{item.step}</span>
                  <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── COMPLAINTS TABLE ──────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-5 pb-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="section-label mb-2">Live Feed</p>
              <h2 className="nmc-serif text-3xl md:text-4xl text-slate-900">Complaints</h2>
              <p className="text-sm text-slate-500 mt-1">Click any row to see live progress, photos & assigned workers</p>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg overflow-hidden border border-slate-200">
                {(["all", "active", "resolved"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setShowMyLocation(false); }}
                    className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
                      statusFilter === f && !showMyLocation
                        ? "bg-green-700 text-white"
                        : "bg-white text-slate-500 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowMyLocation(!showMyLocation);
                  if (!showMyLocation && !myLat) {
                    setMyLocLoading(true);
                    setMyLocError(null);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => { setMyLat(pos.coords.latitude); setMyLng(pos.coords.longitude); setMyLocLoading(false); },
                      () => { setMyLocError("Could not get your location."); setMyLocLoading(false); }
                    );
                  }
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-wider uppercase rounded-lg border transition-colors ${
                  showMyLocation
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <LocateFixed className="w-3.5 h-3.5" />
                My Location
              </button>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="search-input w-36"
              />
            </div>
          </div>

          {/* ── MY LOCATION PANEL ───────────────────────────────────────── */}
          {showMyLocation && (
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <LocateFixed className="w-4 h-4 text-blue-600" />
                <p className="font-bold text-slate-800">My Current Location</p>
              </div>
              {myLocLoading && (
                <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Detecting your location…</span>
                </div>
              )}
              {myLocError && (
                <p className="text-sm text-red-600 py-4 text-center">{myLocError}</p>
              )}
              {myLat && myLng && !myLocLoading && (
                <>
                  <p className="text-xs text-slate-500 mb-2">
                    📍 {myLat.toFixed(5)}, {myLng.toFixed(5)}
                    <button
                      onClick={() => {
                        setMyLocLoading(true); setMyLocError(null);
                        navigator.geolocation.getCurrentPosition(
                          (pos) => { setMyLat(pos.coords.latitude); setMyLng(pos.coords.longitude); setMyLocLoading(false); },
                          () => { setMyLocError("Could not get location."); setMyLocLoading(false); }
                        );
                      }}
                      className="ml-2 text-blue-600 underline text-xs"
                    >Refresh</button>
                  </p>
                  <MapView
                    lat={myLat}
                    lng={myLng}
                    height="340px"
                    zoom={14}
                    markers={[
                      { lat: myLat, lng: myLng, label: "You are here", color: "#2563eb" },
                      ...complaints
                        .filter((c) => c.latitude && c.longitude)
                        .map((c) => ({
                          lat: c.latitude!,
                          lng: c.longitude!,
                          label: c.title,
                          status: c.status,
                        })),
                    ]}
                  />
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Blue pin = you · Coloured dots = complaints
                  </p>
                </>
              )}
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl text-slate-400">
                <Leaf className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No complaints found.</p>
              </div>
            ) : (
              filtered.map((c) => {
                const st = STATUS[c.status] || STATUS.pending;
                const isOverdue = c.deadline && !c.resolved_at && new Date(c.deadline) < new Date();
                return (
                  <div
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-green-300 hover:shadow-sm transition-all duration-150 group"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
                        {c.title || c.subcategory || "Civic Complaint"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{c.address}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.zone && <span className="hidden sm:inline text-xs text-slate-400">{c.zone}</span>}
                      <span className={`badge ${
                        c.status === "resolved"    ? "bg-green-50 border border-green-200 text-green-700" :
                        c.status === "rejected"    ? "bg-red-50 border border-red-200 text-red-600" :
                        c.status === "in_progress" || c.status === "pending_verification" ? "bg-blue-50 border border-blue-200 text-blue-600" :
                        "bg-amber-50 border border-amber-200 text-amber-600"
                      }`}>
                        {st.label}
                      </span>
                      {isOverdue && <span className="overdue-badge hidden sm:inline">Overdue</span>}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-600 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── SERVICES ─────────────────────────────────────────────────────── */}
        <section className="bg-slate-50 border-y border-slate-100 py-16">
          <div className="max-w-6xl mx-auto px-5">
            <div className="mb-10">
              <p className="section-label mb-2">Citizen Services</p>
              <h2 className="nmc-serif text-3xl md:text-4xl text-slate-900">Our Services</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {([
                { title: "File a Complaint",  desc: "Report garbage, drainage & more.",        icon: FileText,  path: "/complaint",  color: "text-green-700", bg: "bg-green-50"  },
                { title: "Zone Schedules",    desc: "Check collection timings for your area.", icon: MapPin,    path: "/zones",      color: "text-amber-700", bg: "bg-amber-50"  },
                { title: "Events & Drives",   desc: "Join NMC cleanliness drives near you.",   icon: Calendar,  path: "/events",     color: "text-purple-700",bg: "bg-purple-50" },
                { title: "Appreciate Workers",desc: "Rate our sanitation field workers.",       icon: Award,     path: "/employees",  color: "text-slate-700", bg: "bg-slate-200" },
              ] as { title: string; desc: string; icon: React.ElementType; path: string; color: string; bg: string }[]).map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.title}
                    to={s.path}
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-green-200 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mb-1">{s.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                    <ArrowRight className="w-4 h-4 text-green-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── ABOUT + AWARENESS ────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-5 py-16">
          <div className="grid md:grid-cols-2 gap-8">
            {/* About */}
            <div className="bg-green-700 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full bg-green-600 opacity-40 pointer-events-none" />
              <p className="section-label mb-3 text-green-300 ">Initiative</p>
              <h2 className="nmc-serif text-2xl md:text-3xl mb-4 leading-snug text-white">About This Project</h2>
              <p className="text-green-100 text-sm leading-relaxed mb-5">
                Swachh Nagpur is an initiative by the Nagpur Municipal Corporation to digitise civic complaint management.
                Citizens can report issues like uncollected garbage, broken drains, toilet upkeep, or construction debris 
                from anywhere, on any device.
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Complaints auto-assigned to the right worker by role & zone",
                  "3-day resolution target with real-time status tracking",
                  "Resolution verified with proof photos uploaded by field staff",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-green-100">
                    <CheckCircle className="w-4 h-4 text-green-300 mt-0.5 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 bg-white text-green-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
              >
                Learn More <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Awareness cards */}
            <div className="flex flex-col gap-4">
              {([
                { icon: Trash2,  color: "text-green-700",  bg: "bg-green-50",  title: "Waste Segregation", desc: "Dry, wet, sanitary & e-waste guide.",   path: "/waste-segregation" },
                { icon: Recycle, color: "text-amber-700",  bg: "bg-amber-50",  title: "Reduce & Recycle",  desc: "Adopt the 3R principles daily.",          path: "/awareness"         },
                { icon: Users,   color: "text-purple-700", bg: "bg-purple-50", title: "Community Events",  desc: "Join local cleanliness drives.",           path: "/events"            },
              ] as { icon: React.ElementType; color: string; bg: string; title: string; desc: string; path: string }[]).map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.title}
                    to={card.path}
                    className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-green-200 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{card.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{card.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-600 flex-shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── DETAIL MODAL ─────────────────────────────────────────────────── */}
        {selected && (
          <div
            className="modal-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          >
            <div className="modal-panel">
              {/* Mobile drag handle */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-slate-100 px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3 z-10 flex-shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest">
                      #{selected.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`badge ${
                      selected.status === "resolved"   ? "bg-green-50 border border-green-200 text-green-700" :
                      selected.status === "rejected"   ? "bg-red-50 border border-red-200 text-red-600" :
                      selected.status === "in_progress"|| selected.status === "pending_verification" ? "bg-blue-50 border border-blue-200 text-blue-600" :
                      "bg-amber-50 border border-amber-200 text-amber-600"
                    }`}>
                      {STATUS[selected.status]?.label ?? selected.status.replace(/_/g, " ")}
                    </span>
                    {selected.priority && (
                      <span className={`badge ${PRIORITY_COLOR[selected.priority] ?? "bg-slate-50 border-slate-200 text-slate-600"}`}>
                        {selected.priority}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg leading-snug">
                    {selected.title || selected.subcategory || "Civic Complaint"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="modal-body px-4 sm:px-6 py-6 pb-10 space-y-7">

                {/* Progress */}
                <div>
                  <p className="section-label mb-4">Progress</p>
                  <ProgressStepper status={selected.status} />
                </div>

                {/* Meta */}
                <div className="bg-slate-50 rounded-xl p-4 text-sm">
                  <div className="flex items-start gap-2 text-slate-600 mb-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                    <span>{selected.address}{selected.zone ? `, ${selected.zone}` : ""}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 font-medium">
                    <span>Filed: {new Date(selected.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {selected.deadline && (
                      <span>Deadline: {new Date(selected.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                    {selected.resolved_at && (
                      <span className="text-green-700">Resolved: {new Date(selected.resolved_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                </div>

                {/* Location Map */}
                {selected.latitude && selected.longitude && (
                  <div>
                    <p className="section-label mb-3">Location on Map</p>
                    <MapView
                      lat={selected.latitude}
                      lng={selected.longitude}
                      height="220px"
                      zoom={16}
                      markers={[{ lat: selected.latitude, lng: selected.longitude, label: selected.title, status: selected.status }]}
                    />
                  </div>
                )}

                {/* Assigned Workers */}
                {assignedWorkers.length > 0 ? (
                  <div>
                    <p className="section-label mb-3">Assigned Workers ({assignedWorkers.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {assignedWorkers.map((w) => (
                        <span key={w.id} className="worker-chip">
                          <User className="w-3.5 h-3.5" />
                          {w.emp?.name ?? "Worker"} · {w.emp?.job}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : selected.employees ? (
                  <div className="flex items-center gap-2">
                    <span className="worker-chip">
                      <User className="w-3.5 h-3.5" />
                      Assigned to {selected.employees.name} ({selected.employees.job})
                    </span>
                  </div>
                ) : null}

                {/* Photos */}
                {(selected.photo_url || selected.resolved_photo_url) && (
                  <div>
                    <p className="section-label mb-3">Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selected.photo_url && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Before (Complaint)</p>
                          <img src={selected.photo_url} alt="Complaint" className="w-full aspect-video object-cover rounded-xl border border-slate-200" />
                        </div>
                      )}
                      {selected.resolved_photo_url && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">After (Resolved)</p>
                          <img src={selected.resolved_photo_url} alt="Resolved" className="w-full aspect-video object-cover rounded-xl border border-slate-200" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Verification Badge */}
                {selected.photo_url && selected.resolved_photo_url && (
                  <div className={`rounded-xl p-4 flex items-start gap-3 ${
                    selected.ai_verification_status === "verified"   ? "ai-verified" :
                    selected.ai_verification_status === "suspicious" ? "ai-suspicious" : "ai-pending"
                  }`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {selected.ai_verification_status === "verified"   ? <ShieldCheck className="w-5 h-5 text-green-600" /> :
                       selected.ai_verification_status === "suspicious" ? <ShieldAlert className="w-5 h-5 text-amber-600" /> :
                       <Bot className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">
                        {selected.ai_verification_status === "verified"     && "NMC-CVA AI: Work Verified ✓"}
                        {selected.ai_verification_status === "suspicious"   && "NMC-CVA AI: Suspicious ⚠  Pending Review"}
                        {(!selected.ai_verification_status || selected.ai_verification_status === "pending") && "AI Verification Pending"}
                        {selected.ai_verification_status === "not_applicable" && "AI Verification Not Applicable"}
                      </p>
                      {selected.ai_verification_score != null && (
                        <p className="text-xs mt-0.5 opacity-70">CleanScore: {selected.ai_verification_score}/100</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Activity Timeline */}
                <div>
                  <p className="section-label mb-4">Activity Log</p>
                  {loadingDetail ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                  ) : activities.length > 0 ? (
                    <div>
                      {activities.map((a, i) => (
                        <TimelineItem key={a.id} activity={a} isLast={i === activities.length - 1} />
                      ))}
                    </div>
                  ) : (
                    <>
                      {selected.employees && (
                        <TimelineItem
                          activity={{ id: "a1", activity_type: "complaint_filed", description: "Complaint submitted and auto-assigned.", created_at: selected.created_at }}
                          isLast={false}
                        />
                      )}
                      {(selected.status === "in_progress" || selected.status === "resolved" || selected.status === "pending_verification") && (
                        <TimelineItem
                          activity={{ id: "a2", activity_type: "work_started", description: "Field worker has started working on this complaint.", created_at: selected.created_at }}
                          isLast={selected.status === "in_progress"}
                        />
                      )}
                      {selected.status === "pending_verification" && (
                        <TimelineItem
                          activity={{ id: "a3", activity_type: "ai_verification_pending", description: "Resolution photo submitted. AI verification in progress.", created_at: selected.created_at }}
                          isLast={false}
                        />
                      )}
                      {selected.resolved_at && (
                        <TimelineItem
                          activity={{ id: "a4", activity_type: "complaint_resolved", description: "Issue has been resolved and verified.", created_at: selected.resolved_at }}
                          isLast={selected.status !== "rejected"}
                        />
                      )}
                      {selected.status === "rejected" && (
                        <TimelineItem
                          activity={{ id: "a5", activity_type: "complaint_rejected", description: "This complaint was reviewed and rejected.", created_at: selected.created_at }}
                          isLast
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Index;