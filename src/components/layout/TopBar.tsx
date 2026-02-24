import { Calendar } from "lucide-react";

const TopBar = () => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="nmc-topbar px-4 py-1.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
        <span className="font-medium">Swachh Nagpur &nbsp;|&nbsp; Nagpur Municipal Corporation</span>
        <div className="hidden sm:flex items-center gap-1 opacity-70">
          <Calendar className="w-3 h-3" />
          <span>{today}</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
