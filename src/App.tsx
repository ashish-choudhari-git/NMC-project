import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import ZonesPage from "./pages/ZonesPage";
import ComplaintPage from "./pages/ComplaintPage";
import EmployeesPage from "./pages/EmployeesPage";
import EventsPage from "./pages/EventsPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import CitizenAuthPage from "./pages/CitizenAuthPage";
import StaffAuthPage from "./pages/StaffAuthPage";
import MyComplaintsPage from "./pages/MyComplaintsPage";
import MyEventsPage from "./pages/MyEventsPage";
import WasteSegregationPage from "./pages/WasteSegregationPage";
import AwarenessPage from "./pages/AwarenessPage";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import MapsPage from "./pages/MapsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<CitizenAuthPage />} />
            <Route path="/staff-auth" element={<StaffAuthPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/zones" element={<ZonesPage />} />
            <Route path="/complaint" element={<ComplaintPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/my-complaints" element={<MyComplaintsPage />} />
            <Route path="/my-events" element={<MyEventsPage />} />
            <Route path="/waste-segregation" element={<WasteSegregationPage />} />
            <Route path="/awareness" element={<AwarenessPage />} />
            <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
            <Route path="/maps" element={<MapsPage />} />
            <Route path="/services" element={<ZonesPage />} />
            <Route path="/timings" element={<ZonesPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
