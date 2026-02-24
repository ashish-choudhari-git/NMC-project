import { 
  Leaf, 
  Droplets, 
  AlertTriangle, 
  Cpu, 
  Recycle, 
  Trash2,
  CheckCircle,
  XCircle,
  Info,
  ArrowRight
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WasteCategory {
  id: string;
  name: string;
  nameHindi: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  items: string[];
  donts: string[];
  disposalMethod: string;
  binColor: string;
}

const wasteCategories: WasteCategory[] = [
  {
    id: "dry",
    name: "Dry Waste",
    nameHindi: "सूखा कचरा",
    icon: <Recycle className="w-8 h-8" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Recyclable materials that are dry and can be processed into new products.",
    items: [
      "Paper and cardboard",
      "Plastic bottles and containers",
      "Glass bottles and jars",
      "Metal cans and foils",
      "Tetra packs",
      "Old newspapers and magazines",
      "Broken ceramics and crockery",
      "Rubber and leather items",
      "Thermocol and foam"
    ],
    donts: [
      "Mix with wet waste",
      "Include soiled paper or cardboard",
      "Add broken glass without wrapping",
      "Include hazardous materials"
    ],
    disposalMethod: "Collect in blue bin. Clean and dry before disposal. Sold to kabadiwala or collected by NMC.",
    binColor: "Blue"
  },
  {
    id: "wet",
    name: "Wet Waste",
    nameHindi: "गीला कचरा",
    icon: <Droplets className="w-8 h-8" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Biodegradable organic waste that can be composted to create natural fertilizer.",
    items: [
      "Vegetable and fruit peels",
      "Leftover food",
      "Eggshells",
      "Tea leaves and coffee grounds",
      "Flowers and plant trimmings",
      "Meat and fish scraps",
      "Dairy products",
      "Coconut shells (broken into pieces)"
    ],
    donts: [
      "Include plastic bags",
      "Mix with non-biodegradable items",
      "Add chemicals or oils",
      "Include pet waste"
    ],
    disposalMethod: "Collect in green bin. Can be composted at home or collected daily by NMC for community composting.",
    binColor: "Green"
  },
  {
    id: "sanitary",
    name: "Sanitary Waste",
    nameHindi: "स्वच्छता कचरा",
    icon: <AlertTriangle className="w-8 h-8" />,
    color: "text-red-600",
    bgColor: "bg-red-50",
    description: "Personal hygiene waste that requires special handling due to health hazards.",
    items: [
      "Diapers (baby and adult)",
      "Sanitary napkins",
      "Tampons",
      "Bandages and cotton swabs",
      "Syringes and needles (in puncture-proof containers)",
      "Expired medicines",
      "Blood-stained items",
      "Condoms"
    ],
    donts: [
      "Dispose in regular bins",
      "Flush down toilets",
      "Leave exposed or unwrapped",
      "Mix with other waste types"
    ],
    disposalMethod: "Wrap securely in newspaper/paper bag, then place in red bin. Mark as 'Sanitary Waste'. Collected separately by NMC.",
    binColor: "Red"
  },
  {
    id: "ewaste",
    name: "E-Waste",
    nameHindi: "इ-कचरा",
    icon: <Cpu className="w-8 h-8" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Electronic and electrical waste containing hazardous materials requiring special recycling.",
    items: [
      "Mobile phones and chargers",
      "Computers and laptops",
      "Keyboards and mice",
      "Televisions and monitors",
      "Batteries (all types)",
      "Light bulbs and tube lights",
      "Wires and cables",
      "Refrigerators and ACs",
      "Washing machines",
      "Printers and cartridges"
    ],
    donts: [
      "Throw in regular dustbins",
      "Burn or incinerate",
      "Break open batteries",
      "Dispose with household waste"
    ],
    disposalMethod: "Store separately and deposit at NMC e-waste collection centers or authorized dealers. Many electronics stores offer take-back programs.",
    binColor: "Yellow/Special"
  }
];

const tips = [
  {
    title: "Segregate at Source",
    description: "Keep separate bins at home for each waste type. This is the most effective way to manage waste."
  },
  {
    title: "Reduce & Reuse First",
    description: "Before throwing away, consider if an item can be reused or repurposed."
  },
  {
    title: "Composting",
    description: "Start home composting for wet waste. It reduces garbage and creates free fertilizer for plants."
  },
  {
    title: "Clean Before Disposal",
    description: "Rinse containers and remove food residue from dry waste to improve recyclability."
  }
];

const WasteSegregationPage = () => {
  return (
    <MainLayout showSidebar>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="nmc-icon-box-primary">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Waste Segregation Guide
            </h1>
            <p className="text-muted-foreground">
              कचरा अलगाव मार्गदर्शिका | Learn to segregate waste properly
            </p>
          </div>
        </div>

        {/* Introduction Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 rounded-2xl p-6 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">
                Why Segregate Waste?
              </h2>
              <p className="text-muted-foreground">
                Proper waste segregation reduces landfill burden by 60%, enables recycling of valuable materials, 
                creates compost from organic waste, and protects sanitation workers from hazardous items. 
                It's mandatory under Solid Waste Management Rules, 2016.
              </p>
            </div>
          </div>
        </div>

        {/* Waste Categories */}
        <div className="grid gap-6">
          {wasteCategories.map((category) => (
            <Card key={category.id} className={`${category.bgColor} border-none overflow-hidden`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center ${category.color}`}>
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className={`font-display text-2xl ${category.color}`}>
                      {category.name}
                    </CardTitle>
                    <p className="text-muted-foreground">{category.nameHindi}</p>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-white shadow-sm ${category.color}`}>
                      {category.binColor} Bin
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{category.description}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* What to Include */}
                  <div className="bg-white/80 rounded-xl p-4">
                    <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      What to Include
                    </h4>
                    <ul className="space-y-1.5">
                      {category.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What NOT to Do */}
                  <div className="bg-white/80 rounded-xl p-4">
                    <h4 className="flex items-center gap-2 font-semibold text-foreground mb-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Don'ts
                    </h4>
                    <ul className="space-y-1.5">
                      {category.donts.map((dont, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <XCircle className="w-3 h-3 mt-1 flex-shrink-0 text-destructive" />
                          {dont}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-4">
                  <h4 className="flex items-center gap-2 font-semibold text-foreground mb-2">
                    <Recycle className="w-5 h-5 text-primary" />
                    Disposal Method
                  </h4>
                  <p className="text-sm text-muted-foreground">{category.disposalMethod}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tips Section */}
        <div className="nmc-card p-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Leaf className="w-6 h-6 text-primary" />
            Eco-Friendly Tips
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {tips.map((tip, idx) => (
              <div key={idx} className="bg-secondary/50 rounded-xl p-4">
                <h4 className="font-semibold text-foreground mb-1">{tip.title}</h4>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Collection Schedule Notice */}
        <div className="bg-accent/10 rounded-2xl p-6 border border-accent/20">
          <h3 className="font-display text-xl font-bold text-foreground mb-3">
            NMC Collection Schedule
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="w-10 h-10 bg-green-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Droplets className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-medium text-foreground">Wet Waste</p>
              <p className="text-sm text-muted-foreground">Daily (6 AM - 9 AM)</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Recycle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-medium text-foreground">Dry Waste</p>
              <p className="text-sm text-muted-foreground">Alternate Days</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="w-10 h-10 bg-red-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="font-medium text-foreground">Sanitary Waste</p>
              <p className="text-sm text-muted-foreground">Every Sunday</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default WasteSegregationPage;
