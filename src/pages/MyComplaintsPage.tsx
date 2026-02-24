import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Complaint {
  id: string;
  title: string;
  subcategory: string | null;
  address: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Pending" },
  in_progress: { icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-100", label: "In Progress" },
  resolved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Resolved" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Rejected" },
};

const MyComplaintsPage = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
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
      fetchComplaints();
    }
  }, [user]);

  const fetchComplaints = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setComplaints(data);
    }
    setLoading(false);
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

  return (
    <MainLayout showSidebar>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="nmc-icon-box-accent">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className=" text-3xl font-bold text-foreground">
                My Complaints
              </h1>
              <p className="text-muted-foreground">
                Track your submitted complaints
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/complaint")} className="nmc-btn-primary">
            New Complaint
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="nmc-stat-card">
            <p className="text-2xl font-bold text-foreground">{complaints.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="nmc-stat-card">
            <p className="text-2xl font-bold text-yellow-600">
              {complaints.filter(c => c.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <div className="nmc-stat-card">
            <p className="text-2xl font-bold text-blue-600">
              {complaints.filter(c => c.status === 'in_progress').length}
            </p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="nmc-stat-card">
            <p className="text-2xl font-bold text-green-600">
              {complaints.filter(c => c.status === 'resolved').length}
            </p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </div>
        </div>

        {/* Complaints List */}
        {complaints.length === 0 ? (
          <div className="nmc-card p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Complaints Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't submitted any complaints.
            </p>
            <Button onClick={() => navigate("/complaint")} className="nmc-btn-primary">
              Submit a Complaint
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {complaints.map((complaint, index) => {
              const status = statusConfig[complaint.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div
                  key={complaint.id}
                  className="nmc-card p-6 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground">
                        {complaint.title || complaint.subcategory}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {complaint.address}
                      </p>
                      {complaint.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {complaint.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyComplaintsPage;
