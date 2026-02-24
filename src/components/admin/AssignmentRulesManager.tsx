import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AssignmentRule {
  id: string;
  category: string | null;
  subcategory: string | null;
  zone: string | null;
  employee_id: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  employees: {
    name: string;
    employee_id: string;
    job: string;
  };
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  zone: string;
  job: string;
}

interface AssignmentRulesManagerProps {
  onUpdate: () => void;
}

const AssignmentRulesManager = ({ onUpdate }: AssignmentRulesManagerProps) => {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRule, setSelectedRule] = useState<AssignmentRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    category: "__any__",
    subcategory: "",
    zone: "__any__",
    employee_id: "",
    priority: 1,
    is_active: true,
  });
  
  const { toast } = useToast();

  const zones = [
    "Central Zone",
    "East Zone",
    "West Zone",
    "North Zone",
    "South Zone",
    "Dharampeth Zone",
    "Hanuman Nagar Zone",
    "Nehru Nagar Zone",
    "Gandhibagh Zone",
    "Satranjipura Zone",
  ];

  useEffect(() => {
    fetchRules();
    fetchEmployees();
    fetchCategories();
  }, []);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('assignment_rules' as any)
      .select(`
        *,
        employees:employee_id (name, employee_id, job)
      `)
      .order('priority', { ascending: true });

    if (data && !error) {
      setRules(data as any);
    }
    setLoading(false);
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

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('complaint_categories')
      .select('name')
      .order('name');

    if (data) {
      setCategories(data.map((c) => c.name));
    }
  };

  const handleCreate = async () => {
    // Validate required fields
    if (!formData.employee_id) {
      toast({
        title: "Validation Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('assignment_rules' as any)
      .insert({
        category: (formData.category && formData.category !== '__any__') ? formData.category : null,
        subcategory: formData.subcategory || null,
        zone: (formData.zone && formData.zone !== '__any__') ? formData.zone : null,
        employee_id: formData.employee_id,
        priority: formData.priority,
        is_active: formData.is_active,
      });

    if (error) {
      toast({
        title: "Create Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Assignment rule created successfully",
    });

    setIsCreateDialogOpen(false);
    resetForm();
    fetchRules();
    onUpdate();
  };

  const handleEdit = async () => {
    if (!selectedRule) return;

    const { error } = await supabase
      .from('assignment_rules' as any)
      .update({
        category: (formData.category && formData.category !== '__any__') ? formData.category : null,
        subcategory: formData.subcategory || null,
        zone: (formData.zone && formData.zone !== '__any__') ? formData.zone : null,
        employee_id: formData.employee_id,
        priority: formData.priority,
        is_active: formData.is_active,
      })
      .eq('id', selectedRule.id);

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
      description: "Assignment rule updated successfully",
    });

    setIsEditDialogOpen(false);
    resetForm();
    fetchRules();
    onUpdate();
  };

  const handleDelete = async () => {
    if (!selectedRule) return;

    const { error } = await supabase
      .from('assignment_rules' as any)
      .delete()
      .eq('id', selectedRule.id);

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
      description: "Assignment rule deleted successfully",
    });

    setIsDeleteDialogOpen(false);
    setSelectedRule(null);
    fetchRules();
    onUpdate();
  };

  const toggleActiveStatus = async (rule: AssignmentRule) => {
    const { error } = await supabase
      .from('assignment_rules' as any)
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);

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
      description: `Rule ${rule.is_active ? 'disabled' : 'enabled'} successfully`,
    });

    fetchRules();
    onUpdate();
  };

  const openEditDialog = (rule: AssignmentRule) => {
    setSelectedRule(rule);
    setFormData({
      category: rule.category || "__any__",
      subcategory: rule.subcategory || "",
      zone: rule.zone || "__any__",
      employee_id: rule.employee_id,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      category: "__any__",
      subcategory: "",
      zone: "__any__",
      employee_id: "",
      priority: 1,
      is_active: true,
    });
  };

  const getRuleDescription = (rule: AssignmentRule) => {
    const parts = [];
    if (rule.category) parts.push(`Category: ${rule.category}`);
    if (rule.subcategory) parts.push(`Subcategory: ${rule.subcategory}`);
    if (rule.zone) parts.push(`Zone: ${rule.zone}`);
    
    if (parts.length === 0) {
      return "Default rule (applies to all)";
    }
    
    return parts.join(" • ");
  };

  if (loading) {
    return <div className="text-center py-8">Loading assignment rules...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Assignment Rules Work</h3>
        <p className="text-sm text-blue-800">
          Rules are applied in order of priority (1 = highest). When a complaint is filed, the system
          looks for the most specific matching rule. Rules can match by category, subcategory, and/or zone.
          Leave fields empty to create broader matching rules. The first active rule that matches will auto-assign
          the complaint to the specified employee.
        </p>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Assignment Rule
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead>Rule Criteria</TableHead>
              <TableHead>Assigned Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {rule.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium mb-1">{getRuleDescription(rule)}</div>
                    <div className="flex gap-2 flex-wrap">
                      {rule.category && (
                        <Badge variant="secondary" className="text-xs">
                          {rule.category}
                        </Badge>
                      )}
                      {rule.subcategory && (
                        <Badge variant="secondary" className="text-xs">
                          {rule.subcategory}
                        </Badge>
                      )}
                      {rule.zone && (
                        <Badge variant="secondary" className="text-xs">
                          {rule.zone}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{rule.employees?.name ?? "(deleted employee)"}</div>
                    <div className="text-gray-500">
                      {rule.employees?.employee_id} • {rule.employees?.job}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      rule.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {rule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRule(rule);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={rule.is_active ? "outline" : "default"}
                      onClick={() => toggleActiveStatus(rule)}
                      className={rule.is_active ? "" : "bg-green-600 hover:bg-green-700"}
                    >
                      {rule.is_active ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedRule(rule);
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

      {rules.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No assignment rules configured yet</p>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Rule
          </Button>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Rule Details</DialogTitle>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Priority</Label>
                  <p className="font-medium">{selectedRule.priority}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Badge
                    className={
                      selectedRule.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {selectedRule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-600">Category</Label>
                  <p>{selectedRule.category || "Any"}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Subcategory</Label>
                  <p>{selectedRule.subcategory || "Any"}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Zone</Label>
                  <p>{selectedRule.zone || "Any"}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Employee</Label>
                  <div>
                    <p className="font-medium">{selectedRule.employees.name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedRule.employees.employee_id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? "Create Assignment Rule" : "Edit Assignment Rule"}
            </DialogTitle>
            <DialogDescription>
              Configure automatic complaint assignment based on criteria. More specific rules should
              have higher priority (lower number).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Priority *</Label>
              <Input
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                }
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower numbers = higher priority. Rules are checked in priority order.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category (Optional)</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategory (Optional)</Label>
                <Input
                  value={formData.subcategory}
                  onChange={(e) =>
                    setFormData({ ...formData, subcategory: e.target.value })
                  }
                  placeholder="Leave empty for any"
                />
              </div>
            </div>

            <div>
              <Label>Zone (Optional)</Label>
              <Select
                value={formData.zone}
                onValueChange={(value) =>
                  setFormData({ ...formData, zone: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any zone</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assign To Employee *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, employee_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id}) - {emp.zone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-gray-500">Enable this rule immediately</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isCreateDialogOpen ? handleCreate : handleEdit}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreateDialogOpen ? "Create Rule" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment rule? This will not affect existing
              complaint assignments. Consider deactivating the rule instead if you want to temporarily
              disable it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AssignmentRulesManager;
