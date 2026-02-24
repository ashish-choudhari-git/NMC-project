/**
 * NMC Swachh Nagpur — Chatbot Utilities
 * =======================================
 * Language detection + quick suggestions for the floating chat widget.
 * AI responses are handled by Google Gemini via the ai-assistant edge function.
 * getBotResponse() is a minimal fallback used only when the API is unavailable.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Language = "hi" | "mr" | "en";

export interface ChatMessage {
  role: "user" | "bot";
  text: string;
  timestamp: Date;
}

// ─── Language Detection ───────────────────────────────────────────────────────

export function detectLanguage(text: string): Language {
  const hindiChars = text.match(/[\u0900-\u097F]/g)?.length ?? 0;
  if (hindiChars === 0) return "en";

  const marathiSignals = ["आहे","नाही","आहेत","करा","तक्रार","माझी","माझे","कसे","मला","नागपूर","वॉर्ड"];
  const hindiSignals   = ["है","नहीं","हैं","करो","शिकायत","मेरी","मेरे","कैसे","मुझे","नागपुर","वार्ड"];

  const ms = marathiSignals.filter((w) => text.includes(w)).length;
  const hs = hindiSignals.filter((w) => text.includes(w)).length;
  return ms > hs ? "mr" : "hi";
}

// ─── Fallback (only when Gemini API is unavailable) ──────────────────────────

const fallback: Record<Language, string> = {
  en: "⚠️ AI service is temporarily unavailable. Please try again in a moment.\n\nHelpline: **1800-233-3333** (Toll Free, Mon–Sat 10AM–6PM)",
  hi: "⚠️ AI सेवा अस्थायी रूप से अनुपलब्ध है। थोड़ी देर में पुनः प्रयास करें।\n\nहेल्पलाइन: **1800-233-3333** (टोल फ्री)",
  mr: "⚠️ AI सेवा तात्पुरती अनुपलब्ध आहे. थोड्या वेळाने पुन्हा प्रयत्न करा.\n\nहेल्पलाइन: **1800-233-3333** (टोल फ्री)",
};

export function getBotResponse(userInput: string): string {
  return fallback[detectLanguage(userInput)];
}

// ─── Quick Suggestion Chips ───────────────────────────────────────────────────

export const quickSuggestions: Record<Language, string[]> = {
  en: [
    "How to file a complaint?",
    "Track my complaint",
    "Waste segregation guide",
    "Nagpur zones info",
    "Upcoming events",
    "Contact NMC",
  ],
  hi: [
    "शिकायत कैसे दर्ज करें?",
    "मेरी शिकायत ट्रैक करें",
    "कचरा अलग करने का तरीका",
    "नागपुर जोन जानकारी",
    "आगामी कार्यक्रम",
    "NMC से संपर्क करें",
  ],
  mr: [
    "तक्रार कशी नोंदवायची?",
    "माझी तक्रार ट्रॅक करा",
    "कचरा वर्गीकरण माहिती",
    "नागपूर झोन माहिती",
    "आगामी कार्यक्रम",
    "NMC शी संपर्क साधा",
  ],
};
