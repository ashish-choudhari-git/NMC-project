import { CheckCircle, Target, Users, Leaf, Building2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";

const AboutPage = () => {
  return (
    <MainLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-6xl mx-auto space-y-20">

          {/* ================= HEADER ================= */}
          <section className="text-center space-y-5">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Swachh Nagpur Initiative
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A flagship cleanliness and waste management program undertaken by
              the Nagpur Municipal Corporation to ensure sustainable urban
              sanitation, environmental responsibility, and citizen well-being.
            </p>
          </section>

          {/* ================= OVERVIEW ================= */}
          <section className="bg-white border rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">
                Program Overview
              </h2>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              Swachh Nagpur is a comprehensive urban sanitation program designed
              to modernize waste collection, improve segregation practices, and
              implement scientific waste processing systems across all
              administrative zones of Nagpur. The initiative aligns with
              national cleanliness standards and promotes responsible waste
              disposal through digital governance and community engagement.
            </p>

            <p className="text-muted-foreground leading-relaxed">
              Through structured operational planning, workforce empowerment,
              and technology-driven monitoring, the program aims to establish a
              transparent and accountable sanitation ecosystem.
            </p>
          </section>

          {/* ================= MISSION & VISION ================= */}
          <section className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border rounded-2xl p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">Mission</h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                To provide efficient, transparent, and citizen-focused waste
                management services while ensuring environmental sustainability
                and public health across all areas of Nagpur.
              </p>
            </div>

            <div className="bg-white border rounded-2xl p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <Leaf className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold">Vision</h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                To establish Nagpur as one of India’s most sustainable and
                efficiently managed metropolitan cities through innovation,
                accountability, and public participation.
              </p>
            </div>
          </section>

          {/* ================= CORE OBJECTIVES ================= */}
          <section className="bg-white border rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold mb-6">
              Core Objectives
            </h2>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                "100% door-to-door waste collection coverage",
                "Mandatory source-level waste segregation",
                "Deployment of scientific waste processing facilities",
                "Digital complaint tracking & monitoring system",
                "Workforce safety and welfare enhancement",
                "Citizen engagement & awareness campaigns",
                "Reduction in landfill dependency",
                "Urban green belt and composting promotion",
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-1" />
                  <p className="text-muted-foreground leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ================= IMPACT STATISTICS ================= */}
          <section>
            <h2 className="text-2xl font-semibold text-center mb-8">
              Operational Impact
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: "10", label: "Administrative Zones" },
                { value: "2.5 Million+", label: "Citizens Covered" },
                { value: "500+", label: "Collection Vehicles" },
                { value: "5,000+", label: "Sanitation Workforce" },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-white border rounded-2xl p-6 text-center shadow-sm"
                >
                  <p className="text-3xl font-bold text-primary">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ================= GOVERNANCE & TEAM ================= */}
          <section className="bg-white border rounded-2xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold">
                Governance & Workforce
              </h2>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              The initiative operates under the supervision of the Nagpur
              Municipal Corporation’s sanitation department, supported by zone
              officers, supervisors, engineers, and administrative staff.
              Over 5,000 sanitation workers contribute daily to maintaining
              cleanliness standards across residential, commercial, and public
              areas.
            </p>

            <p className="text-muted-foreground leading-relaxed">
              Continuous monitoring mechanisms, data-driven reporting, and
              transparent grievance redressal systems ensure accountability
              and service quality.
            </p>
          </section>

        </div>
      </div>
    </MainLayout>
  );
};

export default AboutPage;