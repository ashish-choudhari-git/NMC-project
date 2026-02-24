import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function batchProcess<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.all(items.slice(i, i + batchSize).map(fn));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const { data: employees, error: empErr } = await supabaseAdmin
      .from("employees")
      .select("id, name, email, user_id")
      .not("email", "is", null)
      .neq("email", "");

    if (empErr) throw new Error(`Fetch failed: ${empErr.message}`);
    if (!employees?.length) {
      return new Response(JSON.stringify({ success: true, created: 0, skipped: 0, errors: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    await batchProcess(employees, 20, async (emp) => {
      const email = (emp.email ?? "").trim().toLowerCase();
      if (!email) return;

      // If already linked to a valid auth user, skip entirely
      if (emp.user_id) {
        const { data: existing } = await supabaseAdmin.auth.admin.getUserById(emp.user_id);
        if (existing?.user) {
          skipped++;
          return;
        }
        // Stale user_id — just unlink, do NOT delete auth user (would cascade-delete employee!)
        await supabaseAdmin.from("employees").update({ user_id: null }).eq("id", emp.id);
      }

      // Create auth account
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: "pass@123",
        email_confirm: true,
        user_metadata: { name: emp.name ?? "" },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already") || error.message.toLowerCase().includes("exists")) {
          // Find the existing auth user by listing (limited scope)
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = list?.users?.find((u) => u.email?.toLowerCase() === email);
          if (found) {
            await supabaseAdmin.from("employees").update({ user_id: found.id }).eq("id", emp.id);
            await supabaseAdmin.from("user_roles").upsert({ user_id: found.id, role: "employee" }, { onConflict: "user_id,role" });
            skipped++;
          }
        } else {
          errors.push(`${email}: ${error.message}`);
        }
        return;
      }

      const uid = data.user!.id;
      await Promise.all([
        supabaseAdmin.from("employees").update({ user_id: uid }).eq("id", emp.id),
        supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "employee" }, { onConflict: "user_id,role" }),
      ]);
      created++;
    });

    return new Response(JSON.stringify({ success: true, created, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: String(err?.message ?? err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
