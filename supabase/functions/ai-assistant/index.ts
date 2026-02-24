/**
 * NMC Swachh Nagpur — AI Assistant Edge Function
 * ================================================
 * Powered by OpenRouter (OpenAI-compatible API).
 * Model: google/gemma-3-4b-it:free
 * Supports: English | Hindi (हिंदी) | Marathi (मराठी)
 *
 * Setup:
 *   supabase secrets set OPENROUTER_API_KEY=your_key_here
 *   supabase functions deploy ai-assistant --no-verify-jwt
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the official AI assistant for "NMC Swachh Nagpur" — the Nagpur Municipal Corporation civic complaint and environmental awareness portal.

YOUR IDENTITY:
- Name: NMC Swachh Nagpur Assistant
- You work for Nagpur Municipal Corporation (NMC), Maharashtra, India
- You help citizens of Nagpur with civic services

PORTAL FEATURES you know about:
1. File Complaint — Citizens can report garbage, drainage, road, or sanitation issues with photo
2. Track Complaint — Real-time status: Pending → Assigned → In Progress → Resolved
3. Waste Segregation — Green bin (wet/organic), Blue bin (dry/recyclable), Red bin (hazardous)
4. Zones — NMC divides Nagpur into 10 zones: Central, East, West, South, North, Sadar, Lakadganj, Mangalwari, Ashi Nagar, Nehru Nagar
5. Workers/Employees — 150+ trained sanitation workers across all zones
6. Events — Swachhata Abhiyan, tree plantation, awareness programs
7. Login — Citizens use email/password; NMC staff use @nmc.gov.in email; Admin has special credentials
8. Resolution time — Standard: 3 working days. Escalation: Call 1800-233-3333 (toll free)

LANGUAGE RULES:
- Detect the language from the user's message automatically
- If they write in Hindi → reply fully in Hindi (Devanagari script)
- If they write in Marathi → reply fully in Marathi (Devanagari script)
- If they write in English → reply in English
- If mixed → use the dominant language
- Never mix scripts in a single response unless quoting a term

RESPONSE RULES:
- Be concise and helpful — maximum 150 words per response
- Use bullet points and bold for key info
- Be warm and professional, like a government helpdesk
- If asked about something unrelated to NMC/Nagpur civic services (cricket, movies, cooking, etc.) → politely decline and redirect to NMC topics
- Never make up complaint IDs, employee names, or specific ward numbers
- For urgent issues (sewage overflow, medical waste) → always recommend calling 1800-233-3333

NMC CONTACT:
- Helpline: 1800-233-3333 (Toll Free, Mon–Sat 10AM–6PM)
- HQ: Mahapal Bhavan, Mahal, Nagpur – 440032
- Email: swachh@nagpurcorporation.gov.in`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, history = [] } = await req.json();
    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array.
    // Note: Some models (e.g. Gemma) don't support "system" role,
    // so we inject the system prompt as a user/assistant turn at the start.
    const historyMessages = history.slice(-8).map((h: { role: string; text: string }) => ({
      role: h.role === "bot" ? "assistant" : "user",
      content: h.text,
    }));

    const messages = [
      { role: "user", content: `[SYSTEM INSTRUCTIONS — follow these strictly]\n${SYSTEM_PROMPT}\n[END SYSTEM INSTRUCTIONS]\n\nReady?` },
      { role: "assistant", content: "Yes, I'm ready. I'm the NMC Swachh Nagpur AI assistant and I'll help you in English, Hindi, or Marathi." },
      ...historyMessages,
      { role: "user", content: message },
    ];

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vcncllobjabcrxfubsvq.supabase.co",
        "X-Title": "NMC Swachh Nagpur",
      },
      body: JSON.stringify({
        model: "google/gemma-3-4b-it:free",
        messages,
        temperature: 0.5,
        max_tokens: 400,
      }),
    });

    if (!orRes.ok) {
      const errBody = await orRes.text();
      console.error("OpenRouter error:", orRes.status, errBody);

      if (orRes.status === 429) {
        return new Response(
          JSON.stringify({
            answer: "🙏 I'm a bit busy right now. Please wait a moment and try again!\n\nथोड़ा इंतजार करें और फिर पूछें। / थोडं थांबा आणि पुन्हा विचारा.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `OpenRouter error ${orRes.status}`, fallback: true }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await orRes.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() ||
      "I'm having trouble responding right now. Please try again!";

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-assistant error:", err);
    return new Response(
      JSON.stringify({ error: String(err), fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});