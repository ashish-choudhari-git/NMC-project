import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Settings,
  UserPlus,
  Loader2,
  Mail,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdminComplaintsTable from "@/components/admin/AdminComplaintsTable";
import AdminEventsTable from "@/components/admin/AdminEventsTable";
import AdminEmployeesTable from "@/components/admin/AdminEmployeesTable";
import AssignmentRulesManager from "@/components/admin/AssignmentRulesManager";
import AdminContactMessages from "@/components/admin/AdminContactMessages";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  total_complaints: number;
  pending_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  rejected_complaints: number;
  overdue_complaints: number;
  today_complaints: number;
  week_complaints: number;
  month_complaints: number;
  active_employees: number;
  inactive_employees: number;
  total_events: number;
  approved_events: number;
  pending_events: number;
  avg_resolution_hours: number;
}

const AdminDashboard = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingUpAccounts, setSettingUpAccounts] = useState(false);

  useEffect(() => {
    // Wait for both auth AND role to finish loading before redirecting
    if (!authLoading && user && role !== null && role !== "admin") {
      navigate("/");
    }
    if (!authLoading && !user) {
      navigate("/staff-auth");
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (role === "admin") {
      fetchStats();
    }
  }, [role]);

  const setupEmployeeAccounts = async () => {
    setSettingUpAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-employees");
      // error here is a FunctionsHttpError — the real message is in data
      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message);
      toast({
        title: "Employee accounts setup complete",
        description: `Created: ${data.created}, Skipped (already exist): ${data.skipped}${data.errors?.length ? `. Errors: ${data.errors.length} (check console)` : ""}`,
      });
      if (data?.errors?.length) {
        console.error("Setup errors:", data.errors);
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      toast({
        title: "Setup failed",
        description: msg,
        variant: "destructive",
      });
      console.error("setupEmployeeAccounts error:", msg);
    } finally {
      setSettingUpAccounts(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_dashboard_stats" as any)
        .select("*")
        .single();

      if (data && !error) {
        setStats(data as any);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  // Show spinner while auth is loading, user not ready, role not determined, or stats loading
  if (authLoading || !user || role === null || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  // Extra guard — should be caught by useEffect redirect
  if (role !== "admin") {
    return null;
  }

  const statCards = [
    {
      title: "Total Complaints",
      value: stats?.total_complaints ?? 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Pending",
      value: stats?.pending_complaints ?? 0,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "In Progress",
      value: stats?.in_progress_complaints ?? 0,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Resolved",
      value: stats?.resolved_complaints ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Overdue",
      value: stats?.overdue_complaints ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Active Employees",
      value: stats?.active_employees ?? 0,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Total Events",
      value: stats?.total_events ?? 0,
      icon: Calendar,
      color: "text-pink-600",
      bg: "bg-pink-50",
    },
    {
      title: "Avg Resolution (hrs)",
      value: stats?.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : "N/A",
      icon: LayoutDashboard,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="text-green-600" size={32} />
              Admin Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Nagpur Municipal Corporation — Central Control Panel
            </p>
          </div>
          <Button
            onClick={setupEmployeeAccounts}
            disabled={settingUpAccounts}
            className="bg-green-700 hover:bg-green-800 text-white flex items-center gap-2"
          >
            {settingUpAccounts ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            {settingUpAccounts ? "Setting up..." : "Setup Employee Accounts"}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <Card key={card.title} className="border border-gray-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {card.title}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <card.icon className={card.color} size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick summary bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.today_complaints ?? 0}
              </p>
              <p className="text-xs text-gray-400">new complaints</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.week_complaints ?? 0}
              </p>
              <p className="text-xs text-gray-400">new complaints</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.month_complaints ?? 0}
              </p>
              <p className="text-xs text-gray-400">new complaints</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="complaints">
          <TabsList className="mb-4 bg-gray-100">
            <TabsTrigger value="complaints" className="flex items-center gap-2">
              <FileText size={16} /> Complaints
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users size={16} /> Employees
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar size={16} /> Events
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings size={16} /> Assignment Rules
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <Mail size={16} /> Contact Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="complaints">
            <AdminComplaintsTable onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="employees">
            <AdminEmployeesTable onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="events">
            <AdminEventsTable onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="rules">
            <AssignmentRulesManager onUpdate={fetchStats}/>
          </TabsContent>

          <TabsContent value="messages">
            <AdminContactMessages />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
