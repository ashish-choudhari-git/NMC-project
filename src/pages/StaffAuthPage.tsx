import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shield, Eye, EyeOff, Mail, Lock, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const StaffAuthPage = () => {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, signOut, resetPassword, user, role } = useAuth();

  // Redirect if already logged in as staff
  useEffect(() => {
    if (user && role === "admin") navigate("/admin");
    if (user && role === "employee") navigate("/employee-dashboard");
  }, [user, role, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const forgotForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);

    const { error } = await signIn(data.email, data.password);

    if (error) {
      setIsSubmitting(false);
      toast({
        title: "Login Failed",
        description: error.message === "Invalid login credentials"
          ? "Invalid email or password. Please try again."
          : error.message,
        variant: "destructive",
      });
      return;
    }

    // Sign-in succeeded — now verify this person is actually staff, NOT a citizen
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id)
        .maybeSingle();

      const userRole = roleRow?.role;

      if (userRole === "admin") {
        setIsSubmitting(false);
        navigate("/admin");
        return;
      }
      if (userRole === "employee") {
        setIsSubmitting(false);
        navigate("/employee-dashboard");
        return;
      }

      // Role is citizen or missing — boot them out immediately
      await signOut();
      setIsSubmitting(false);
      toast({
        title: "Access Denied",
        description: "This portal is for NMC staff only. Please use the Citizen Login.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(false);
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    const { error } = await resetPassword(data.email);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Reset Email Sent!",
      description: "Please check your email for password reset instructions.",
    });
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Citizen Auth */}
        <Link 
          to="/auth" 
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Citizen Login
        </Link>

        {/* Staff Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-display text-3xl font-bold text-gray-900">Staff Portal</h2>
            <p className="text-gray-600 mt-2">
              {mode === "login" ? "Government Employee & Admin Access" : "Reset Your Password"}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-xs text-amber-800 border border-amber-200">
              <Building2 className="w-3 h-3" />
              Authorized Personnel Only
            </div>
          </div>

          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">Official Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="employee@nmc.gov.in"
                    className="pl-11 h-12 border-gray-300 focus:border-green-600 focus:ring-green-600"
                    {...loginForm.register("email")}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-11 pr-11 h-12 border-gray-300 focus:border-green-600 focus:ring-green-600"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setMode("forgot")}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Forgot Password?
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing In..." : "Sign In to Staff Portal"}
              </Button>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Note: Staff accounts are created by the IT department. 
                  Contact your administrator if you need access.
                </p>
              </div>
            </form>
          ) : (
            <>
              <button 
                onClick={() => setMode("login")} 
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>

              <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail" className="text-gray-700 font-medium">Official Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="employee@nmc.gov.in"
                      className="pl-11 h-12 border-gray-300 focus:border-green-600 focus:ring-green-600"
                      {...forgotForm.register("email")}
                    />
                  </div>
                  {forgotForm.formState.errors.email && (
                    <p className="text-sm text-red-600">{forgotForm.formState.errors.email.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Security Notice</p>
              <p>This portal is for authorized Nagpur Municipal Corporation personnel only. 
              Unauthorized access attempts are logged and may result in legal action.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAuthPage;
