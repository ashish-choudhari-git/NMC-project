import { Link, useLocation } from "react-router-dom";
import { 
  FileText, 
  Calendar, 
  MapPin, 
  Clock, 
  Award, 
  ChevronRight,
  HelpCircle,
  Trash2,
  Leaf
} from "lucide-react";

const sidebarItems = [
  { path: "/complaint", label: "Complaint Section", icon: FileText },
  { path: "/events", label: "Events Section", icon: Calendar },
  { path: "/zones", label: "Zone Schedule", icon: MapPin },
  { path: "/timings", label: "Collection Timings", icon: Clock },
  { path: "/employees", label: "Appreciate Workers", icon: Award },
  { path: "/waste-segregation", label: "Waste Segregation", icon: Trash2 },
  { path: "/awareness", label: "Awareness & Tips", icon: Leaf },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-card rounded-2xl shadow-nmc-card p-4 h-fit sticky top-4">
      <nav>
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nmc-sidebar-item ${isActive ? "active" : ""}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "rotate-90" : ""}`} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Help Card */}
      <div className="mt-6 p-4 bg-secondary rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Need Help?</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Contact our 24/7 support for any queries.
        </p>
        <Link 
          to="/contact" 
          className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          Get Support
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
