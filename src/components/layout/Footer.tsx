import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="bg-slate-800 text-slate-200 mt-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* Brand */}
        <div>
  <div className="flex items-center gap-3 mb-3">
    <div className="w-10 h-10 rounded-lg bg-green-600 text-white font-bold text-sm flex items-center justify-center">
      CN
    </div>

    <span className="font-semibold text-white text-sm leading-tight">
      Clean Nagpur
    </span>
  </div>

  <p className="text-slate-400 text-sm leading-relaxed">
    Clean Nagpur is a community-driven civic platform focused on cleaner,
    transparent, and sustainable city services.
  </p>
</div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">
            Quick Links
          </h4>
          <ul className="space-y-2 text-sm">
            {[
              ["/zones", "Zone Schedule"],
              ["/complaint", "Register Complaint"],
              ["/my-complaints", "Track Complaint"],
              ["/events", "Events & Campaigns"],
              ["/employees", "Appreciate Workers"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link
                  to={to}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">
            Services
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            {[
              "Garbage Collection",
              "Waste Segregation",
              "Recycling Programs",
              "Drainage Maintenance",
              "Public Sanitation Services",
            ].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">
            Contact
          </h4>
          <ul className="space-y-3 text-sm text-slate-400">
            
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
              <span>
                Nagpur Municipal Corporation, Civil Lines,<br />
                Nagpur – 440001, Maharashtra, India
              </span>
            </li>

            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 flex-shrink-0 text-blue-400" />
              <span>+91-712-2567000</span>
            </li>

            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 flex-shrink-0 text-blue-400" />
              <span>commissioner@nmc.gov.in</span>
            </li>

          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-700 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} Clean Nagpur. 
          All Rights Reserved.
        </p>
        <p>Community Civic Platform for Nagpur City.</p>
      </div>
    </div>
  </footer>
);

export default Footer;