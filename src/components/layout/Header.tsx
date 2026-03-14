import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, User, ChevronDown, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import nmcLogo from "@/assets/nmc-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/zones", label: "Zones" },
  { path: "/complaint", label: "File Complaint" },
  { path: "/maps", label: "Maps" },
  { path: "/employees", label: "Workers" },
  { path: "/events", label: "Events" },
  { path: "/contact", label: "Contact" },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, role, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const displayName = profile
    ? `${profile.first_name || ""}`.trim() || profile.email
    : user?.email;

  const dashboardPath =
    role === "admin" ? "/admin" : role === "employee" ? "/employee-dashboard" : "/";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 flex-shrink-0 group"
          >
            <img
              src={nmcLogo}
              alt="Nagpur Municipal Corporation Logo"
              className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />

            <div className="leading-tight hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">
                Mission Clean
              </p>
              <p className="text-xs text-slate-500">
               Clean Nagpur
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm px-3 py-2 rounded-md font-medium transition-colors duration-150 ${location.pathname === item.path
                    ? "bg-green-50 text-green-700"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                  }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:block max-w-[100px] truncate">{displayName}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(role === "admin" || role === "employee") && (
                    <>
                      <DropdownMenuItem onClick={() => navigate(dashboardPath)}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {role === "citizen" && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/my-complaints")}>
                        My Complaints
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-events")}>
                        My Events
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="hidden sm:flex text-slate-600"
                >
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")} className="bg-green-700 hover:bg-green-800 text-white">
                  Get Started
                </Button>
              </div>
            )}
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm px-3 py-2 rounded-md font-medium ${location.pathname === item.path
                  ? "bg-green-50 text-green-700"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              {item.label}
            </Link>
          ))}
          {!user && (
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="block text-sm px-3 py-2 rounded-md font-medium text-green-700 hover:bg-green-50"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
