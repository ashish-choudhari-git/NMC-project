import { useEffect, useState } from "react";
import { Search, Plus, Edit2, Trash2, Eye, CheckCircle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  user_id: string | null;
  employee_id: string;
  name: string;
  zone: string;
  job: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  age: number | null;
  gender: string | null;
  is_active: boolean;
  main_area: string | null;
  rating: number;
  total_ratings: number;
  created_at: string;
}

interface AdminEmployeesTableProps { onUpdate: () => void; }

const ZONES = [
  "Central Zone","East Zone","West Zone","North Zone","South Zone",
  "Dharampeth Zone","Hanuman Nagar Zone","Nehru Nagar Zone","Gandhibagh Zone","Satranjipura Zone",
];
const JOBS = [
  "Toilet Cleaner","Sanitation Worker","Garbage Collector","Sweeper",
  "Street Sweeper","Waste Collector","Drainage Worker","Plumber",
  "Construction Worker","Road Worker","Field Officer","Supervisor","Zone Officer","Inspector",
];
const GENDERS = ["Male","Female","Other"];

const emptyForm = { name:"", email:"", password:"pass@123", employee_id:"", zone:"", job:"", phone:"", address:"", age:"", gender:"Male", main_area:"", is_active: true };

const AdminEmployeesTable = ({ onUpdate }: AdminEmployeesTableProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const { toast } = useToast();

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("name");
    if (data) setEmployees(data as any[]);
    setLoading(false);
  };

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const genEmployeeId = () => "EMP" + String(Math.floor(100000 + Math.random() * 900000));

  const openCreate = () => {
    setForm({ ...emptyForm, employee_id: genEmployeeId() });
    setIsCreateOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setForm({
      name: emp.name, email: emp.email || "", password: "",
      employee_id: emp.employee_id, zone: emp.zone, job: emp.job,
      phone: emp.phone || "", address: emp.address || "",
      age: emp.age ? String(emp.age) : "", gender: emp.gender || "Male",
      main_area: emp.main_area || "", is_active: emp.is_active,
    });
    setIsEditOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.job || !form.zone || !form.employee_id) {
      toast({ title: "Required fields missing", description: "Name, Email, Password, Job, Zone, Employee ID are required.", variant:"destructive" }); return;
    }
    setSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('create-employee', {
        body: { ...form, age: form.age ? parseInt(form.age) : null },
      });
      if (error) throw new Error(error.message || "Failed to create employee");
      toast({ title: "Employee Created", description: `${form.name} has been added successfully.` });
      setIsCreateOpen(false);
      fetchEmployees(); onUpdate();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleEdit = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);
    const { error } = await supabase.from("employees").update({
      name: form.name, zone: form.zone, job: form.job,
      phone: form.phone || null, address: form.address || null,
      age: form.age ? parseInt(form.age) : null, gender: form.gender,
      main_area: form.main_area || null, is_active: form.is_active,
    }).eq("id", selectedEmployee.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant:"destructive" });
    } else {
      toast({ title: "Updated", description: "Employee updated successfully." });
      setIsEditOpen(false); fetchEmployees(); onUpdate();
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    const { error } = await supabase.from("employees").delete().eq("id", selectedEmployee.id);
    if (error) { toast({ title: "Error", description: error.message, variant:"destructive" }); }
    else { toast({ title: "Deleted", description: "Employee removed." }); fetchEmployees(); onUpdate(); }
    setIsDeleteOpen(false);
  };

  const toggleActive = async (emp: Employee) => {
    const { error } = await supabase.from("employees").update({ is_active: !emp.is_active }).eq("id", emp.id);
    if (!error) fetchEmployees();
  };

  const filtered = employees.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q) || (e.email || "").toLowerCase().includes(q);
    const matchZ = zoneFilter === "all" || e.zone === zoneFilter;
    const matchJ = jobFilter === "all" || e.job === jobFilter;
    return matchQ && matchZ && matchJ;
  });

  const FormFields = ({ showPwd = false }: { showPwd?: boolean }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label className="nmc-label">Full Name *</Label>
        <Input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Rajesh Sharma" className="text-sm" />
      </div>
      <div>
        <Label className="nmc-label">Employee ID *</Label>
        <Input value={form.employee_id} onChange={e=>set("employee_id",e.target.value)} placeholder="EMP001" className="text-sm" />
      </div>
      <div>
        <Label className="nmc-label">Email *</Label>
        <Input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="emp@gmail.com" className="text-sm" />
      </div>
      {showPwd && (
        <div>
          <Label className="nmc-label">Password *</Label>
          <Input type="text" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="pass@123" className="text-sm" />
        </div>
      )}
      <div>
        <Label className="nmc-label">Phone</Label>
        <Input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="9876500001" className="text-sm" />
      </div>
      <div>
        <Label className="nmc-label">Age</Label>
        <Input type="number" value={form.age} onChange={e=>set("age",e.target.value)} placeholder="30" className="text-sm" />
      </div>
      <div>
        <Label className="nmc-label">Gender</Label>
        <Select value={form.gender} onValueChange={v=>set("gender",v)}>
          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{GENDERS.map(g=><SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="nmc-label">Job Role *</Label>
        <Select value={form.job} onValueChange={v=>set("job",v)}>
          <SelectTrigger className="text-sm"><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent>{JOBS.map(j=><SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="nmc-label">Zone *</Label>
        <Select value={form.zone} onValueChange={v=>set("zone",v)}>
          <SelectTrigger className="text-sm"><SelectValue placeholder="Select zone" /></SelectTrigger>
          <SelectContent>{ZONES.map(z=><SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label className="nmc-label">Main Area</Label>
        <Input value={form.main_area} onChange={e=>set("main_area",e.target.value)} placeholder="Sitabuldi, Civil Lines..." className="text-sm" />
      </div>
      <div className="sm:col-span-2">
        <Label className="nmc-label">Address</Label>
        <Input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="House no, Street, Nagpur" className="text-sm" />
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        <input type="checkbox" id="is_active" checked={form.is_active} onChange={e=>set("is_active",e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-green-700" />
        <Label htmlFor="is_active" className="text-sm text-slate-700 cursor-pointer">Active employee</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e=>setSearchQuery(e.target.value)}
              placeholder="Search name, ID, email..."
              className="pl-9 text-sm"
            />
          </div>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="All Zones" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {ZONES.map(z=><SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="All Jobs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {JOBS.map(j=><SelectItem key={j} value={j}>{j}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="bg-green-700 hover:bg-green-800 text-white text-sm">
          <Plus className="w-4 h-4 mr-1" /> Add Employee
        </Button>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} employee{filtered.length !== 1 ? "s" : ""} found</p>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12"><div className="w-7 h-7 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : (
        <div className="nmc-card overflow-x-auto">
          <table className="nmc-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Job / Zone</th>
                <th>Contact</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div>
                      <p className="font-medium text-slate-800">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.employee_id}</p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="text-xs font-medium text-slate-700">{emp.job}</p>
                      <p className="text-xs text-slate-400">{emp.zone}</p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="text-xs text-slate-600">{emp.email || "â€”"}</p>
                      <p className="text-xs text-slate-400">{emp.phone || "â€”"}</p>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs text-amber-600 font-medium">
                      {emp.total_ratings > 0 ? `â˜… ${Number(emp.rating).toFixed(1)} (${emp.total_ratings})` : "â€”"}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleActive(emp)}>
                      {emp.is_active ? (
                        <span className="badge-resolved"><CheckCircle className="w-3 h-3" /> Active</span>
                      ) : (
                        <span className="badge-rejected"><XCircle className="w-3 h-3" /> Inactive</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setSelectedEmployee(emp); setIsViewOpen(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(emp)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelectedEmployee(emp); setIsDeleteOpen(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
          <FormFields showPwd />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-green-700 hover:bg-green-800 text-white">
              {submitting ? "Creating..." : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting} className="bg-green-700 hover:bg-green-800 text-white">
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {selectedEmployee && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              {[
                ["ID", selectedEmployee.employee_id],
                ["Name", selectedEmployee.name],
                ["Job", selectedEmployee.job],
                ["Zone", selectedEmployee.zone],
                ["Main Area", selectedEmployee.main_area],
                ["Email", selectedEmployee.email],
                ["Phone", selectedEmployee.phone],
                ["Age", selectedEmployee.age],
                ["Gender", selectedEmployee.gender],
                ["Address", selectedEmployee.address],
                ["Rating", selectedEmployee.total_ratings > 0 ? `${Number(selectedEmployee.rating).toFixed(1)} (${selectedEmployee.total_ratings} ratings)` : "Not rated"],
                ["Status", selectedEmployee.is_active ? "Active" : "Inactive"],
                ["Joined", new Date(selectedEmployee.created_at).toLocaleDateString("en-IN")],
              ].map(([label, value]) => value && (
                <div key={String(label)} className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className="text-slate-800 text-right max-w-[60%]">{String(value)}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{selectedEmployee?.name}</strong> and all their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEmployeesTable;
