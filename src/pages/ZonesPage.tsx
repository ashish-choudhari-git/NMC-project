import { useState } from "react";
import { MapPin, Clock, Calendar, ChevronDown, CheckCircle, Search } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";

type ScheduleEntry = { day: string; time: string; type: "wet" | "dry" | "both" };
type Zone = {
  id: number;
  name: string;
  areas: string[];
  schedule: ScheduleEntry[];
  color?: string;
};

const defaultSchedule: ScheduleEntry[] = [
  { day: "Monday", time: "6:00 AM - 9:00 AM", type: "wet" },
  { day: "Tuesday", time: "6:00 AM - 9:00 AM", type: "dry" },
  { day: "Wednesday", time: "6:00 AM - 9:00 AM", type: "wet" },
  { day: "Thursday", time: "6:00 AM - 9:00 AM", type: "dry" },
  { day: "Friday", time: "6:00 AM - 9:00 AM", type: "both" },
  { day: "Saturday", time: "6:00 AM - 9:00 AM", type: "wet" },
];

export const zones: Zone[] = [
  {
    id: 1,
    name: "Laxmi Nagar (Zone 1)",
    areas: [
      "Bajaj Nagar",
      "Laxmi Nagar East",
      "Vasant Nagar",
      "Rahate Colony",
      "Dikshabhumi Complex",
      "Matakacheri",
      "Ramdaspeth",
      "Nera Gurudwara (part)",
      "ICR Residence",
      "Saraswati Nagar",
      "Takiya",
      "Congress Nagar",
      "Ajani Railway Station area",
      "Doctor's Colony",
      "Vainaganga Nagar",
      "Central Jail Campus (area)",
      "Gaurakshan (part)",
      "Dhantoli (some part)",
      "Chunabhatti",
      "Samarth Nagar (E/W)",
      "Hindusthan Colony",
      "Prashant Nagar",
      "Gajanan Nagar",
      "Old Ajani",
      "Chatrapati Nagar",
      "Panchdeep Nagar",
      "Mehar Colony",
      "Ujwal Nagar",
      "Karveynagar",
      "Somalwada",
      "Rahul Nagar",
      "Mulik Complex",
      "Niri Vasahat",
      "Surendra Nagar",
      "Dhangar Mohalla",
      "Dev Nagar",
      "Sawarkar Nagar",
      "Vivekananda Nagar",
      "LIC Colony",
      // some ward sub-areas included in PDF
    ],
    schedule: defaultSchedule,
    color: "bg-zone-1",
  },

  {
    id: 2,
    name: "Dharampeth (Zone 2)",
    areas: [
      "Dabha",
      "Tekadiwadi",
      "Press Layout",
      "Ganga Nagar",
      "Jagdish Nagar",
      "Makar Dhokada",
      "Surendragarh",
      "Jagruti Colony",
      "Friends Colony",
      "Akar Nagar",
      "IBM Road Campus area",
      "Manavseva Nagar",
      "Gajanan Nagar",
      "Narmada Colony",
      "Bivsenkhori",
      "Vayusena Campus",
      "Hazari Pahad area",
      "Malabar Colony",
      "New Futala",
      "Saraikar Nagar",
      "LIT Campus (parts)",
      "Hindustan Colony",
      "Ram Nagar",
      "Pandharabodi",
      "Sanjay Nagar",
      "Hill Top",
      "Ambazari (locations / layouts)",
      "Verma Layout",
      "Gandhi Nagar",
      "Corporation Colony",
      "Daga Layout",
      "Ambazari Layout",
      "Abhyankar Nagar",
      "Madhav Nagar",
      "VNIT Campus (parts)",
      "Kamla Nagar",
      "Mahadeo Nagar",
      "Kachhimate",
      "Ambazari Garden / Ambazari Lake area",
      "Futala Lake area (parts)",
      "Botanical Garden vicinity",
      "Raj Bhavan Campus",
      "Nirmal Hostel area",
      "Sadar Gandhi Chowk",
      "Azad Chowk",
      "Gawalipura",
      "Gond Mohalla",
      "Khatikpura",
      "NMC Head Office Campus",
      "District Court area",
      "Railway Officer Residence area",
      "Railway Club area",
      "Saraf Chamber",
      "All Saints Church area",
      "Tiger Gap Ground",
      "Bijali Nagar",
      "Tirpude College Campus",
      "Gittikhadan (south part)",
      "Azad Nagar / Krishna Nagar",
      "C.P.W.D Quarters",
      "Balodyan",
      "Center Point School area",
      "S.F.S College",
      "Futala (some parts)",
      "Tilak Nagar",
      "Civil Lines (parts)",
      "University Campus vicinity",
      "Priyadarshini Colony",
      "Ramgiri",
      "High Court area",
      "Vijay Club area",
      "Gokulpeth",
      "Shivaji Nagar",
      "Shankar Nagar",
      "L.A.D College area",
      "Dandike Layout",
      "Ramdaspeth",
      "Dharampeth Extension",
      "Giripeth",
      "Maharajbagh Campus",
      "Patrakar Colony",
      "Nagpur University area",
      "Punjabrao Deshmukh College area",
      // additional smaller sub-areas appearing in PDF...
    ],
    schedule: defaultSchedule,
    color: "bg-zone-2",
  },

  {
    id: 3,
    name: "Hanuman Nagar / VRTM (Zone 3)",
    areas: [
      "Hanuman Nagar",
      "Trimurti Nagar",
      "Manewada",
      "Pratap Nagar (parts)",
      "Suyog Nagar",
      "Rameshwari",
      "Khamla",
      "Shastri Layout",
      "Azad Hind Society",
      "Nelco Society",
      "Bhausaheb Surve Nagar",
      "Bhange Vihar",
      "Milind Nagar",
      "Vyankatesh Nagar",
      "Pandy Layout",
      "Snehnagar",
      "Jaiprakash Nagar",
      "Tapovan",
      "Sahakar Nagar",
      "Gajanan Dham",
      "Sonegaon Vasti",
      "Sonegaon Talav area",
      "Perfect Society",
      "H.B. Estate",
      "Airport area vicinity",
      "Bhende Layout",
      "Manish Layout",
      "Nagpur Vijay Society",
      "Dubey Layout",
      "Bhamti Vasti",
      "Sonegaon Police Station area",
      // and other ward subareas mentioned in PDF
    ],
    schedule: defaultSchedule,
    color: "bg-zone-3",
  },

  {
    id: 4,
    name: "Dhantoli (Zone 4)",
    areas: [
      "Dhantoli",
      "Ramdaspeth",
      "Civil Lines (parts)",
      "Sadar",
      "Mohan Nagar",
      "Congress Nagar",
      "Gond Mohalla (overlaps)",
      "Bijli Nagar",
      "Tirupati / academic campuses",
      // the PDF includes many central area sublocalities (see official doc)
    ],
    schedule: [
      { day: "Monday", time: "6:30 AM - 9:30 AM", type: "wet" },
      { day: "Tuesday", time: "6:30 AM - 9:30 AM", type: "dry" },
      { day: "Wednesday", time: "6:30 AM - 9:30 AM", type: "wet" },
      { day: "Thursday", time: "6:30 AM - 9:30 AM", type: "dry" },
      { day: "Friday", time: "6:30 AM - 9:30 AM", type: "both" },
      { day: "Saturday", time: "6:30 AM - 9:30 AM", type: "wet" },
    ],
    color: "bg-zone-4",
  },

  {
    id: 5,
    name: "Satranjipura (Zone 5)",
    areas: [
      "Sataranjipura",
      "Mominpura",
      "Gandhibagh",
      "Itwari",
      "Jagnath Budhwari area",
      "Hansapuri",
      "Binaki Mangalwari",
      "Anand Nagar",
      "Hudco Quarters",
      "Sanjay Gandhi Nagar",
      "Indira Mata Nagar",
      "Bhola Nagar",
      "Mehendibagh Colony",
      "Jamdar Wadi",
      "Ishwar Deshmukh Layout",
      "Kinkheda Layout",
      "Vrindawan Nagar",
      "Joshipura",
      "Jai Bhole Nagar",
      "Kundanlal Gupta Nagar",
      "Namdeo Nagar",
      "Atre Nagar",
      "Indira Nagar",
      "Bohara Kabrastan",
      "Panch Quarter",
      // (and other adjacent localities listed in the PDF)
    ],
    schedule: defaultSchedule,
    color: "bg-zone-5",
  },

  {
    id: 6,
    name: "Gandhibagh (Zone 6)",
    areas: [
      "Boriyapura",
      "Saifi Nagar",
      "Ansar Nagar",
      "Guard Lines",
      "Mayo / Mayo Hospital campus area",
      "Bhankheda",
      "Kabrastan area",
      "Mominpura",
      "Bakara Mandi",
      "Timki",
      "Khatikpura",
      "Rambhaji Road",
      "Golibar Chowk",
      "Haidari Masjid campus",
      "Kasabpura",
      "Panaipeth",
      "Chitanavisapura",
      "Shivaji Nagar",
      "Ratan Colony",
      "Chhatrapati School area",
      "M.S.E.B Office area",
      "Pataleshwar Mandir area",
      "Ram Mandir Marg area",
      "Bhosle Wada",
      "Bhutiya Darwaja",
      "Kalyaneshwar Mandir",
      "Town Hall area",
      "Shingada Market",
      "Colone Bagh",
      "Ramjichi Wadi",
      "Kasibai Mandir",
      "Rahatekar Wadi",
      "Gadikhana",
      "Joharipura",
      "Kothi Road",
      "Siraspeth",
      "Mattipura",
      // and many small sub-areas from the PDF
    ],
    schedule: defaultSchedule,
    color: "bg-zone-6",
  },

  {
    id: 7,
    name: "Satranjipura / surrounding (Zone 7 - Satranjipura as named in PDF)",
    areas: [
      // This zone block in PDF contains multiple small localities / slum clusters / colony names
      "Binaki Mangalwari",
      "Anand Nagar",
      "Hudco Quarters",
      "Sanjay Gandhi Nagar",
      "Indira Mata Nagar",
      "Bhola Nagar",
      "Mehendibagh Colony",
      "Jamdar Wadi",
      "Ishwar Deshmukh Layout",
      "Kinkheda Layout",
      "Vrindawan Nagar",
      "Joshipura",
      "Jai Bhole Nagar",
      "Kundanlal Gupta Nagar",
      "Namdeo Nagar",
      "Atre Nagar",
      "Indira Nagar",
      "Bohara Kabrastan",
      "Panch Quarter",
      // etc.
    ],
    schedule: defaultSchedule,
    color: "bg-zone-7",
  },

  {
    id: 8,
    name: "Lakadganj (Zone 8)",
    areas: [
      "Kalamna Basti",
      "Wanjra / Wanjri",
      "Bharatwada",
      "Kalamna Railway Station area",
      "Harihar Mandir area",
      "Dhanya Bazar",
      "Small factory area",
      "Sudarshan Nagar",
      "Wardhaman Nagar",
      "Deshpande Layout",
      "Padole Nagar",
      "Hivari Nagar",
      "Shastri Nagar",
      "Kumbhar Toli",
      "Vyankatesh Nagar",
      "K.D.K College vicinity",
      "Punapur",
      "Bhavani Nagar",
      "Pardi",
      "Navin Nagar",
      "Samata Nagar",
      "Shivshakti Nagar",
      "Shyam Nagar",
      "Durga Nagar",
      "Hanuman Nagar",
      "Gandhi Kuti Layout",
      "Bhandewadi",
      "Anant Nagar",
      // etc.
    ],
    schedule: defaultSchedule,
    color: "bg-zone-8",
  },

  {
    id: 9,
    name: "Ashi Nagar (Zone 9)",
    areas: [
      "Ashi Nagar",
      "Jaripatka",
      "Narigaon",
      "Sugat Nagar",
      "Kabir Nagar",
      "Kalpana Nagar",
      "Mayur Nagar",
      "Pilli River area",
      "Bhadant Anand Kauslyavan Nagar",
      "Maa Bambleshwari Nagar",
      "Uppalwadi",
      "Babadeep Singh Nagar",
      "Ramai Nagar",
      "Power Grid area",
      "WCL Rescue Station area",
      "Nalanda Nagar",
      "Sanyal Nagar",
      "Bank Colony",
      "Kapil Nagar",
      // etc.
    ],
    schedule: defaultSchedule,
    color: "bg-zone-9",
  },

  {
    id: 10,
    name: "Mangalwari / Laxmi Nagar mix (Zone 10)",
    areas: [
      "Mahal",
      "Sitabuldi",
      "Mangalwari",
      "Punapur",
      "Ayodhya Nagar",
      "Chitralok / Chitar Oli",
      "Gandhibagh (parts)",
      "Cotton Market",
      "Maskasath",
      "Khamla (parts)",
      "Laxmi Nagar",
      "Mankapur",
      "Friends Colony",
      "Narendra Nagar",
      "Hudkeshwar",
      "Besa",
      "Manish Nagar",
      "Bezanbagh",
      "Bhandewadi",
      // etc.
    ],
    schedule: defaultSchedule,
    color: "bg-zone-10",
  },
  {
  id: 11,
  name: "Hingna & Surroundings",
  areas: [
    "Hingna Naka",
    "Sai Nagar",
    "Pardhi Nagar",
    "Bansi Nagar",
    "Lokmanya Nagar",
    "Rajiv Nagar",
    "Ray Town",
    "Isasani",
    "Wanadongri",
    "Sutgirni",
    "Raju Nagar",
    "Electric Zone",
    "Amar Nagar",
    "Police Nagar",
    "Durga Nagar",
    "Kalmegh Nagar",
    "Hingna Road area",
    "CRPF Colony",
    "SRP Camp",
    "IC Chowk Square",
    "Midc Hingna",
    "Hingna Railway Station vicinity",
    "Hingna Bazaar",
    "Hingna Bus Stand area"
  ],
  schedule: [
    { day: "Monday", time: "6:00 AM - 9:00 AM", type: "wet" },
    { day: "Tuesday", time: "6:00 AM - 9:00 AM", type: "dry" },
    { day: "Wednesday", time: "6:00 AM - 9:00 AM", type: "wet" },
    { day: "Thursday", time: "6:00 AM - 9:00 AM", type: "dry" },
    { day: "Friday", time: "6:00 AM - 9:00 AM", type: "both" },
    { day: "Saturday", time: "6:00 AM - 9:00 AM", type: "wet" },
  ],
  color: "bg-zone-11",
}
];

const ZonesPage = () => {
  const [expandedZone, setExpandedZone] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [search, setSearch] = useState("");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const filteredZones = search.trim()
    ? zones.filter(
        (z) =>
          z.name.toLowerCase().includes(search.toLowerCase()) ||
          z.areas.some((a) => a.toLowerCase().includes(search.toLowerCase()))
      )
    : zones;

  const getTypeLabel = (type: "wet" | "dry" | "both") => {
    switch (type) {
      case "wet":
        return { label: "Wet Waste", className: "bg-primary/10 text-primary" };
      case "dry":
        return { label: "Dry Waste", className: "bg-accent/10 text-accent" };
      case "both":
        return { label: "All Waste", className: "bg-secondary text-secondary-foreground" };
    }
  };

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <MainLayout showSidebar>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="nmc-icon-box-primary">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Zone Collection Schedule
            </h1>
            <p className="text-muted-foreground">
              Garbage collection schedules for all 10 zones of Nagpur
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search zones or areas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-primary">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">10</p>
              <p className="text-sm text-muted-foreground">Total Zones</p>
            </div>
          </div>
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-accent">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">6 AM</p>
              <p className="text-sm text-muted-foreground">First Collection</p>
            </div>
          </div>
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">6</p>
              <p className="text-sm text-muted-foreground">Days/Week</p>
            </div>
          </div>
          <div className="nmc-stat-card">
            <div className="nmc-icon-box-accent">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">100%</p>
              <p className="text-sm text-muted-foreground">Coverage</p>
            </div>
          </div>
        </div>

        {/* Day Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDay("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDay === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              All Days
            </button>
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedDay === day
                    ? "bg-primary text-primary-foreground"
                    : day === todayName
                    ? "bg-accent/10 text-accent border border-accent hover:bg-accent/20"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {day}
                {day === todayName && " (Today)"}
              </button>
            ))}
          </div>
        </div>

        {/* Zone Cards */}
        <div className="space-y-4">
          {filteredZones.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No zones or areas found for "{search}".</p>
          )}
          {filteredZones.map((zone) => {
            const isExpanded = expandedZone === zone.id;
            const filteredSchedule =
              selectedDay === "all"
                ? zone.schedule
                : zone.schedule.filter((s) => s.day === selectedDay);

            return (
              <div
                key={zone.id}
                className="nmc-card overflow-hidden animate-slide-up"
              >
                {/* Zone Header */}
                <button
                  onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl ${zone.color} flex items-center justify-center text-white font-bold`}>
                    {zone.id}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{zone.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {zone.areas.slice(0, 3).join(", ")}
                      {zone.areas.length > 3 && ` +${zone.areas.length - 3} more`}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border animate-fade-in">
                    {/* Areas */}
                    <div className="p-4 bg-secondary/30">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Areas Covered:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {zone.areas.map((area) => (
                          <span
                            key={area}
                            className="px-3 py-1 bg-card rounded-full text-sm text-foreground"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="divide-y divide-border">
                      {filteredSchedule.map((schedule) => {
                        const typeInfo = getTypeLabel(schedule.type);
                        return (
                          <div
                            key={schedule.day}
                            className={`nmc-schedule-row ${
                              schedule.day === todayName ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {schedule.day}
                                {schedule.day === todayName && (
                                  <span className="ml-2 text-xs text-primary">(Today)</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{schedule.time}</span>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo.className}`}
                              >
                                {typeInfo.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-secondary rounded-xl">
          <h4 className="font-semibold text-foreground mb-3">Waste Collection Legend</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-sm text-muted-foreground">Wet Waste (Kitchen waste, food scraps)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-accent"></span>
              <span className="text-sm text-muted-foreground">Dry Waste (Paper, plastic, metal)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-secondary-foreground"></span>
              <span className="text-sm text-muted-foreground">All Waste (Both types)</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ZonesPage;
