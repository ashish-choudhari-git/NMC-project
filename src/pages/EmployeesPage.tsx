import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Star,
  MapPin,
  User,
  Send,
  Search,
  Building,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  job: string;
  age: number | null;
  zone: string;
  main_area: string | null;
  photo_url: string | null;
  rating: number;
  total_ratings: number;
}

interface EncouragementForm {
  username: string;
  address: string;
  rating: number;
  description: string;
}

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [formData, setFormData] = useState<EncouragementForm>({
    username: "",
    address: "",
    rating: 5,
    description: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        username: `${profile.first_name || ""} ${
          profile.last_name || ""
        }`.trim(),
        address: profile.address || "",
      }));
    }
  }, [profile]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true)
      .order("rating", { ascending: false });

    if (data) setEmployees(data);
  };

  const zones = [...new Set(employees.map((e) => e.zone))];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.job.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone =
      selectedZone === "all" || emp.zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  const totalAppreciations = employees.reduce(
    (sum, emp) => sum + emp.total_ratings,
    0
  );

  const avgRating =
    employees.length > 0
      ? (
          employees.reduce((sum, emp) => sum + emp.rating, 0) /
          employees.length
        ).toFixed(1)
      : "0.0";

  const handleOpenEncouragement = (employee: Employee) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to encourage employees.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEmployee) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from("employee_encouragements")
      .insert({
        user_id: user.id,
        employee_id: selectedEmployee.id,
        username: formData.username,
        address: formData.address,
        rating: formData.rating,
        description: formData.description,
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const newTotalRatings =
      selectedEmployee.total_ratings + 1;

    const newRating =
      (selectedEmployee.rating *
        selectedEmployee.total_ratings +
        formData.rating) /
      newTotalRatings;

    await supabase
      .from("employees")
      .update({
        rating: newRating,
        total_ratings: newTotalRatings,
      })
      .eq("id", selectedEmployee.id);

    toast({
      title: "Thank You!",
      description: "Encouragement submitted successfully.",
    });

    setIsDialogOpen(false);
    fetchEmployees();
  };

  const renderStars = (
    rating: number,
    interactive = false,
    onSelect?: (rating: number) => void
  ) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onSelect?.(star)}
        >
          <Star
            className={`w-5 h-5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-slate-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <MainLayout showSidebar>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Award className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Encourage Employees
            </h1>
            <p className="text-slate-500 text-sm">
              Appreciate the hardworking team
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[
            { label: "Active Workers", value: employees.length },
            {
              label: "Total Appreciations",
              value: totalAppreciations,
            },
            { label: "Average Rating", value: avgRating },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
            >
              <p className="text-3xl font-semibold text-slate-900">
                {stat.value}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-400 outline-none"
            />
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-400 outline-none"
          >
            <option value="all">All Zones</option>
            {zones.map((zone) => (
              <option key={zone}>{zone}</option>
            ))}
          </select>
        </div>

        {/* Employee Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition"
            >
              <div className="w-20 h-20 rounded-full bg-slate-100 mx-auto mb-4 flex items-center justify-center overflow-hidden">
                {employee.photo_url ? (
                  <img
                    src={employee.photo_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <h3 className="text-center font-semibold text-slate-900">
                {employee.name}
              </h3>

              <p className="text-center text-xs bg-slate-100 text-slate-600 rounded-full px-3 py-1 mt-2">
                {employee.job}
              </p>

              <div className="flex justify-center mt-3">
                {renderStars(Math.round(employee.rating))}
              </div>

              <div className="text-xs text-slate-500 text-center mt-3 space-y-1">
                <p>ID: {employee.employee_id}</p>
                <p>{employee.zone}</p>
              </div>

              <Button
                onClick={() =>
                  handleOpenEncouragement(employee)
                }
                className="w-full mt-5 bg-green-700 hover:bg-green-600 text-white rounded-xl"
              >
                Encourage
              </Button>

              <p className="text-xs text-slate-400 text-center mt-2">
                {employee.total_ratings} appreciations
              </p>
            </div>
          ))}
        </div>

        {/* Dialog */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        >
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                Encouragement Form
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <Input
                placeholder="Your Name"
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value,
                  })
                }
              />

              <Input
                placeholder="Your Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address: e.target.value,
                  })
                }
              />

              <Textarea
                placeholder="Write something..."
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting
                  ? "Submitting..."
                  : "Submit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default EmployeesPage;