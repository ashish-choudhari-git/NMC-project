import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  getBotResponse,
  detectLanguage,
  quickSuggestions,
  type ChatMessage,
  type Language,
} from "@/lib/chatbotAI";

const WELCOME_MESSAGE: ChatMessage = {
  role: "bot",
  text: "नमस्ते! Hello! नमस्कार! 👋\n\nI'm your NMC Swachh Nagpur Assistant. You can chat with me in **English**, **हिंदी**, or **मराठी**!\n\nHow can I help you today?",
  timestamp: new Date(),
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [detectedLang, setDetectedLang] = useState<Language>("en");
  const [showSuggestions, setShowSuggestions] = useState(true);
  // null = not checked yet, true = Gemini active, false = local fallback
  const [aiMode, setAiMode] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const userText = (text ?? inputValue).trim();
    if (!userText) return;

    const lang = detectLanguage(userText);
    setDetectedLang(lang);
    setShowSuggestions(false);

    const userMessage: ChatMessage = { role: "user", text: userText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Build history for edge function (exclude welcome message, send last 8)
    const history = messages
      .slice(1) // skip welcome
      .slice(-8) // last 8 messages for context
      .map((m) => ({ role: m.role, text: m.text }));

    let responseText = "";
    let usedGemini = false;

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { message: userText, history },
      });

      if (!error && data?.answer && !data?.fallback) {
        responseText = data.answer;
        usedGemini = true;
      } else {
        // Gemini not configured or errored → local fallback
        responseText = getBotResponse(userText);
      }
    } catch {
      responseText = getBotResponse(userText);
    }

    setAiMode(usedGemini);

    const botMessage: ChatMessage = {
      role: "bot",
      text: responseText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const langLabels: Record<Language, string> = { en: "EN", hi: "हि", mr: "म" };
  const langColors: Record<Language, string> = {
    en: "bg-blue-100 text-blue-700",
    hi: "bg-orange-100 text-orange-700",
    mr: "bg-purple-100 text-purple-700",
  };

  const suggestions = quickSuggestions[detectedLang];

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
          open
            ? "bg-red-500 hover:bg-red-600"
            : "bg-green-600 hover:bg-green-700"
        }`}
        aria-label={open ? "Close chatbot" : "Open chatbot"}
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
        {/* Ping indicator */}
        {!open && (
          <span className="absolute top-0 right-0 w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-3 md:right-6 z-50 w-[520px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col  transition-all duration-300 ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        }`}
        style={{ height: "680px" }}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex items-center gap-3 flex-shrink-0 rounded-t-2xl">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">
              NMC Swachh Nagpur
            </p>
            <p className="text-green-100 text-xs flex items-center gap-1">
              {aiMode === true ? (
                <><Zap className="w-3 h-3 text-yellow-300" /> EN / हिं / म</>
              ) : (
                <>Smart Assistant • EN / हिं / म</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-xs px-1.5 py-0 font-semibold border-0 ${langColors[detectedLang]}`}
            >
              {langLabels[detectedLang]}
            </Badge>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === "bot"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {msg.role === "bot" ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "bot"
                      ? "bg-slate-100 text-slate-800 rounded-tl-sm"
                      : "bg-green-600 text-white rounded-tr-sm"
                  }`}
                >
                  <MessageText text={msg.text} isBot={msg.role === "bot"} />
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === "bot" ? "text-slate-400" : "text-green-100"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-green-700" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Suggestions */}
        {showSuggestions && !isTyping && (
          <div className="px-3 pb-2 flex-shrink-0">
            <p className="text-xs text-slate-400 mb-1.5 font-medium">Quick questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-full px-2.5 py-1 transition-colors leading-tight max-w-[160px] truncate"
                  title={s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-3 pb-3 pt-1 flex-shrink-0 border-t border-slate-100">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type in English, हिंदी or मराठी…"
              className="flex-1 text-sm rounded-xl border-slate-200 focus-visible:ring-green-500"
              disabled={isTyping}
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              className="bg-green-600 hover:bg-green-700 rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-1.5">
            NMC Swachh Nagpur Portal Assistant
          </p>
        </div>
      </div>
    </>
  );
}

// ── Helper: render bold markdown & newlines ────────────────────────────────────
function MessageText({ text, isBot }: { text: string; isBot: boolean }) {
  // Convert **bold**, newlines to JSX
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Parse **bold** markers
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="leading-snug">
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className={isBot ? "text-slate-900 font-semibold" : "text-white font-semibold"}>
                  {part}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}
