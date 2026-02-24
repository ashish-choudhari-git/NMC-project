import { useState } from "react";
import { 
  Leaf, 
  Wind, 
  Droplets, 
  Factory, 
  Car, 
  TreeDeciduous,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Sparkles,
  ThumbsUp
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AwarenessSection {
  id: string;
  title: string;
  titleHindi: string;
  icon: React.ReactNode;
  color: string;
  content: string[];
  tips: string[];
}

const awarenessSections: AwarenessSection[] = [
  {
    id: "air",
    title: "Air Pollution Prevention",
    titleHindi: "वायु प्रदूषण रोकथाम",
    icon: <Wind className="w-6 h-6" />,
    color: "text-sky-600",
    content: [
      "Air pollution in Nagpur is caused primarily by vehicle emissions, industrial activities, construction dust, and burning of waste.",
      "High levels of PM2.5 and PM10 particles can cause respiratory diseases, heart problems, and reduced life expectancy.",
      "The Air Quality Index (AQI) should be monitored regularly, especially during winter months when pollution levels spike."
    ],
    tips: [
      "Use public transport, carpool, or cycle whenever possible",
      "Keep vehicles well-maintained with regular PUC checks",
      "Avoid burning garbage, leaves, or crop residue",
      "Plant trees around your home and locality",
      "Use air purifiers indoors during high pollution days",
      "Wear N95 masks when AQI exceeds 200"
    ]
  },
  {
    id: "water",
    title: "Water Conservation",
    titleHindi: "जल संरक्षण",
    icon: <Droplets className="w-6 h-6" />,
    color: "text-blue-600",
    content: [
      "Nagpur receives water from various sources including Kanhan River, Pench Dam, and groundwater. These sources are under stress due to increasing demand.",
      "Water pollution from industrial effluents and untreated sewage affects both surface and groundwater quality.",
      "Rainwater harvesting can supplement 20-30% of household water needs and help recharge groundwater."
    ],
    tips: [
      "Fix leaking taps and pipes immediately - one drip per second wastes 10,000 liters/year",
      "Install low-flow showerheads and faucet aerators",
      "Reuse RO wastewater for mopping and gardening",
      "Implement rainwater harvesting at home",
      "Use bucket instead of shower - saves 100 liters per bath",
      "Run washing machine only with full loads"
    ]
  },
  {
    id: "cleanliness",
    title: "Cleanliness & Hygiene",
    titleHindi: "स्वच्छता एवं स्वास्थ्य",
    icon: <Sparkles className="w-6 h-6" />,
    color: "text-green-600",
    content: [
      "Swachh Bharat Mission aims to make India open defecation free and achieve scientific solid waste management.",
      "Clean surroundings prevent breeding of mosquitoes and flies, reducing diseases like dengue, malaria, and cholera.",
      "Community participation is essential for maintaining cleanliness in public spaces and neighborhoods."
    ],
    tips: [
      "Never litter in public places - use dustbins",
      "Clean drain covers near your home weekly",
      "Don't allow stagnant water to accumulate",
      "Participate in neighborhood cleanliness drives",
      "Report overflowing garbage bins to NMC",
      "Keep toilet areas clean and use disinfectants"
    ]
  },
  {
    id: "industrial",
    title: "Industrial Pollution Control",
    titleHindi: "औद्योगिक प्रदूषण नियंत्रण",
    icon: <Factory className="w-6 h-6" />,
    color: "text-orange-600",
    content: [
      "Industrial areas like MIDC Hingna and Butibori contribute to air and water pollution through emissions and effluent discharge.",
      "Maharashtra Pollution Control Board (MPCB) monitors and regulates industrial pollution through consent-to-operate permits.",
      "Citizens can report industrial pollution violations to MPCB through their online portal or helpline."
    ],
    tips: [
      "Report smoke-emitting factories to MPCB (1800-233-4040)",
      "Document pollution incidents with photos and videos",
      "Support businesses with good environmental practices",
      "Attend public hearings for new industrial projects",
      "Join citizen monitoring committees",
      "Spread awareness about industrial pollution effects"
    ]
  },
  {
    id: "vehicle",
    title: "Vehicle Emissions",
    titleHindi: "वाहन उत्सर्जन",
    icon: <Car className="w-6 h-6" />,
    color: "text-purple-600",
    content: [
      "Vehicles contribute 40-50% of urban air pollution through exhaust emissions containing carbon monoxide, nitrogen oxides, and particulate matter.",
      "Old vehicles without catalytic converters and two-wheelers are major polluters in cities.",
      "Electric vehicles and CNG vehicles produce significantly lower emissions than petrol/diesel vehicles."
    ],
    tips: [
      "Get PUC certificate renewed every 6 months",
      "Consider switching to electric or CNG vehicles",
      "Avoid idling - turn off engine at traffic signals longer than 30 seconds",
      "Keep tires properly inflated for better fuel efficiency",
      "Use carpooling apps for daily commute",
      "Plan trips efficiently to reduce total kilometers driven"
    ]
  },
  {
    id: "green",
    title: "Green Initiatives",
    titleHindi: "हरित पहल",
    icon: <TreeDeciduous className="w-6 h-6" />,
    color: "text-emerald-600",
    content: [
      "Urban green spaces improve air quality, reduce heat island effect, and provide habitat for urban wildlife.",
      "Each mature tree absorbs about 22 kg of CO2 per year and provides enough oxygen for 2 people.",
      "NMC's green Nagpur initiative aims to increase tree cover through plantation drives and protection of existing trees."
    ],
    tips: [
      "Plant native trees like Neem, Peepal, and Banyan",
      "Maintain a kitchen garden or terrace garden",
      "Adopt a tree in your neighborhood",
      "Participate in NMC plantation drives",
      "Report illegal tree cutting to forest department",
      "Create vertical gardens if space is limited"
    ]
  }
];

const faqs = [
  {
    question: "How can I report environmental violations in Nagpur?",
    answer: "You can report violations through the NMC helpline (1800-XXX-XXXX), MPCB portal, or file a complaint on Mission Clean Nagpur app. For emergencies, contact the nearest police station."
  },
  {
    question: "What is the penalty for littering in public places?",
    answer: "Under NMC bylaws, littering can attract fines from ₹200 to ₹5,000 depending on the severity. Repeat offenders may face higher penalties."
  },
  {
    question: "How do I start composting at home?",
    answer: "Start with a simple pot composting system. Layer wet waste with dry leaves or sawdust. Turn the mixture weekly. Compost is ready in 2-3 months. NMC provides free composting workshops."
  },
  {
    question: "Where can I dispose of e-waste in Nagpur?",
    answer: "NMC has authorized e-waste collection centers at each zone office. Many electronics stores also accept old devices. Check NMC website for nearest collection point."
  }
];

const AwarenessPage = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <MainLayout showSidebar>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="nmc-icon-box-primary">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Environmental Awareness
            </h1>
            <p className="text-muted-foreground">
              पर्यावरण जागरूकता | Learn about pollution prevention & cleanliness
            </p>
          </div>
        </div>

        {/* AI Chatbot Promo Banner */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 text-base">
                  Have questions? Chat with our AI Assistant! 🤖
                </h3>
                <p className="text-green-700 text-sm mt-0.5">
                  Ask in <strong>English</strong>, <strong>हिंदी</strong>, or <strong>मराठी</strong> about complaints, waste segregation, zones, events and more.
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-green-600 font-medium">Click the</p>
                <p className="text-xs text-green-600 font-medium">💬 button</p>
                <p className="text-xs text-green-600 font-medium">below →</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Awareness Sections */}
        <div className="grid gap-6">
          {awarenessSections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/30">
                <CardTitle className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${section.color}`}>
                    {section.icon}
                  </div>
                  <div>
                    <span className="block">{section.title}</span>
                    <span className="text-sm font-normal text-muted-foreground">{section.titleHindi}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {section.content.map((para, idx) => (
                  <p key={idx} className="text-muted-foreground">{para}</p>
                ))}
                
                <div className="bg-secondary/50 rounded-xl p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-accent" />
                    Tips & Actions
                  </h4>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {section.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <ThumbsUp className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Warning Signs */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              Health Warning Signs from Pollution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "Persistent cough or breathing difficulty",
                "Eye irritation and watering",
                "Skin rashes or allergies",
                "Frequent headaches",
                "Nausea near polluted areas",
                "Unusual taste in water",
                "Foul odors in neighborhood",
                "Discolored water from taps"
              ].map((sign, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive" />
                  <span className="text-muted-foreground">{sign}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-destructive/80">
              If you experience any of these symptoms consistently, consult a doctor and report the environmental issue to authorities.
            </p>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-medium text-foreground">{faq.question}</span>
                  {expandedFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                {expandedFaq === idx && (
                  <div className="px-4 pb-4">
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AwarenessPage;
