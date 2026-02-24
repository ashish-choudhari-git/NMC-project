import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ── helpers ────────────────────────────────────────────────────────────── */

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf  = await res.arrayBuffer();
  const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return { data: b64, mimeType: mime.split(";")[0] };
}

/* ── main handler ───────────────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { complaint_id } = await req.json();
    if (!complaint_id) throw new Error("complaint_id is required");

    /* Init Supabase admin client */
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* Fetch complaint row */
    const { data: complaint, error: fetchErr } = await supabase
      .from("complaints")
      .select("id, photo_url, resolved_photo_url, title, subcategory, address")
      .eq("id", complaint_id)
      .single();

    if (fetchErr || !complaint) throw new Error("Complaint not found");

    const { photo_url, resolved_photo_url, title, subcategory, address } = complaint;

    /* Both photos required */
    if (!photo_url || !resolved_photo_url) {
      await supabase.from("complaints").update({
        ai_verification_status: "not_applicable",
        ai_verification_reason: "One or both photos are missing. AI verification requires both complaint and resolution photos.",
        ai_verified_at: new Date().toISOString(),
      }).eq("id", complaint_id);

      return new Response(
        JSON.stringify({ status: "not_applicable", reason: "Missing photos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /* Convert images to base64 for Gemini */
    const [beforeImg, afterImg] = await Promise.all([
      urlToBase64(photo_url),
      urlToBase64(resolved_photo_url),
    ]);

    /* Call Gemini Vision API */
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY is not configured in Supabase secrets");

    const prompt = `You are an AI verification system for the Nagpur Municipal Corporation (NMC) civic complaint system.

A citizen filed a complaint about: "${title || subcategory || "civic issue"}" at "${address}".

You are given TWO images:
- IMAGE 1 (BEFORE): The original complaint photo showing the problem.
- IMAGE 2 (AFTER): The resolution photo submitted by the field worker claiming the issue is fixed.

Your task:
1. Carefully compare both images.
2. Determine if the problem shown in IMAGE 1 has been genuinely resolved in IMAGE 2.
3. Look for signs like: area is clean / garbage removed / drain cleared / toilet cleaned / debris removed — matching the complaint type.
4. Watch out for FRAUD: same dirty photo reused, completely unrelated area shown, blank/low-quality photo submitted.

Respond ONLY with this exact JSON (no markdown, no extra text):
{
  "verified": true or false,
  "confidence": <number 0-100>,
  "verdict": "<one short sentence, max 15 words>",
  "reason": "<2-3 sentences explaining your analysis>"
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: beforeImg.mimeType, data: beforeImg.data } },
              { inlineData: { mimeType: afterImg.mimeType, data: afterImg.data } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    /* Parse JSON response from Gemini */
    let aiResult: { verified: boolean; confidence: number; verdict: string; reason: string };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      aiResult = JSON.parse(jsonMatch?.[0] ?? "{}");
    } catch {
      throw new Error(`Could not parse Gemini response: ${rawText}`);
    }

    const status = aiResult.verified
      ? (aiResult.confidence >= 65 ? "verified" : "suspicious")
      : "suspicious";

    /* Save result back to complaints */
    await supabase.from("complaints").update({
      ai_verification_status: status,
      ai_verification_score:  aiResult.confidence ?? null,
      ai_verification_reason: `[${aiResult.verdict}] ${aiResult.reason}`,
      ai_verified_at:         new Date().toISOString(),
    }).eq("id", complaint_id);

    return new Response(
      JSON.stringify({
        status,
        confidence: aiResult.confidence,
        verdict:    aiResult.verdict,
        reason:     aiResult.reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("verify-resolution error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
