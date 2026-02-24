import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileText, 
  ChevronRight, 
  MapPin, 
  Send,
  Toilet,
  Trash2,
  Droplets,
  Construction,
  Sparkles,
  Cylinder,
  CheckCircle,
  AlertCircle,
  Route,
  Waves,
  Lightbulb,
  ShieldAlert,
  Dog,
  Trees,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ImageUpload from "@/components/complaint/ImageUpload";

const complaintSchema = z.object({
  address: z.string().min(5, "Address is required"),
  description: z.string().optional(),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

interface ComplaintCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: string[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "toilet": Toilet,
  "trash-2": Trash2,
  "droplets": Droplets,
  "construction": Construction,
  "sparkles": Sparkles,
  "cylinder": Cylinder,
  "route": Route,
  "waves": Waves,
  "lightbulb": Lightbulb,
  "shield-alert": ShieldAlert,
  "dog": Dog,
  "trees": Trees,
};

const ComplaintPage = () => {
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const form = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      address: profile?.address || "",
      description: "",
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (profile?.address) {
      form.setValue("address", profile.address);
    }
  }, [profile, form]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('complaint_categories')
      .select('*');
    
    if (data) {
      setCategories(data.map(cat => ({
        ...cat,
        subcategories: typeof cat.subcategories === 'string' 
          ? JSON.parse(cat.subcategories) 
          : cat.subcategories || []
      })));
    }
  };

  const reasons = ["Dirty", "Hazardous", "Stench", "Disease spreading", "Pollution"];

  const handleReasonToggle = (reason: string) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async (data: ComplaintFormData) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to submit a complaint.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!selectedCategory || !selectedSubcategory) {
      toast({
        title: "Selection Required",
        description: "Please select a category and subcategory.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('complaints')
      .insert({
        user_id: user.id,
        category_id: selectedCategory.id,
        subcategory: selectedSubcategory,
        title: selectedSubcategory,
        address: data.address,
        description: data.description,
        reason: selectedReasons,
        photo_url: photoUrl || null,
        status: 'pending',
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsSuccess(true);
    toast({
      title: "Complaint Submitted!",
      description: "Your complaint has been registered successfully.",
    });
  };

  if (isSuccess) {
    return (
      <MainLayout showSidebar>
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Complaint Submitted Successfully!
          </h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Your complaint has been registered. We will review it and take appropriate action within 24-48 hours.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/my-complaints")} className="nmc-btn-primary">
              View My Complaints
            </Button>
            <Button onClick={() => {
              setIsSuccess(false);
              setSelectedCategory(null);
              setSelectedSubcategory(null);
              setSelectedReasons([]);
              setPhotoUrl("");
              form.reset();
            }} variant="outline">
              Submit Another
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSidebar>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="nmc-icon-box-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Complaint Section
            </h1>
            <p className="text-muted-foreground">
              Report issues in your area for quick resolution
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-accent/10 rounded-xl mb-8 border border-accent/20">
          <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Quick Resolution Guaranteed</p>
            <p className="text-sm text-muted-foreground">
              All complaints are addressed within 1-3 days.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Category Selection */}
          <div className="nmc-card p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              Select the Complaint Category
            </h2>
            
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = iconMap[category.icon] || FileText;
                const isSelected = selectedCategory?.id === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedSubcategory(null);
                    }}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-left font-medium">{category.name}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  </button>
                );
              })}
            </div>

            {/* Subcategories */}
            {selectedCategory && selectedCategory.subcategories.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-foreground mb-3">
                  {selectedCategory.name}
                </h3>
                <div className="space-y-2">
                  {selectedCategory.subcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubcategory(sub)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                        selectedSubcategory === sub
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        selectedSubcategory === sub ? "bg-accent-foreground" : "bg-muted-foreground"
                      }`} />
                      <span className="text-sm">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Complaint Form */}
          <div className="nmc-card p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">
              Online Complaint Form
            </h2>

            {selectedSubcategory && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  Selected: {selectedSubcategory}
                </p>
              </div>
            )}

            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder="Enter your location/address"
                    className="pl-10"
                    {...form.register("address")}
                  />
                </div>
                {form.formState.errors.address && (
                  <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <div className="flex flex-wrap gap-2">
                  {reasons.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => handleReasonToggle(reason)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedReasons.includes(reason)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Additional Information</Label>
                <Textarea
                  id="description"
                  placeholder="Provide any additional details..."
                  rows={4}
                  {...form.register("description")}
                />
              </div>

              {user && (
                <div className="space-y-2">
                  <Label>Add a Photo (Optional)</Label>
                  <ImageUpload
                    userId={user.id}
                    onImageUploaded={(url) => setPhotoUrl(url)}
                    currentImageUrl={photoUrl}
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full nmc-btn-primary gap-2"
                disabled={isSubmitting || !selectedSubcategory}
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Submitting..." : "Submit Complaint"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ComplaintPage;
