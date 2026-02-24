/**
 * create-auth-accounts.mjs
 *
 * Creates auth accounts for:
 *   - Admin:     nmc@gmail.com / pass@123
 *   - Employees: <email>@nmc.gov.in / pass@123
 *
 * Strategy: auth.admin.createUser (POST) is broken on this project due to
 * dropped GoTrue triggers. Instead we use:
 *   1. supabase.auth.signUp()              — creates the account
 *   2. supabase.auth.admin.updateUserById() — confirms the email (PATCH works fine)
 *
 * Run AFTER running the master migration SQL.
 * Usage:  node scripts/create-auth-accounts.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = 'https://igsnjuqwljpjxjdhkfvw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc25qdXF3bGpwanhqZGhrZnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTYzNTQyOSwiZXhwIjoyMDg3MjExNDI5fQ.E53Sq58r-W021nORBzLlI8F1Qd4bGz_c972BTePrUCc';
const PASSWORD            = 'pass@123';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ---------------------------------------------------------------
async function createOrGetUser(email, name) {
  // Step 1: Try signUp (works even when admin.createUser is broken)
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password: PASSWORD,
  });

  if (!signupError) {
    const userId = signupData.user?.id;
    if (!userId) {
      console.error(`  ✗ signUp returned no user id for ${email}`);
      return null;
    }

    // Step 2: Confirm email via PATCH (updateUserById works fine)
    const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
      user_metadata: { name },
    });

    if (confirmError) {
      console.error(`  ✗ email confirm failed for ${email}: ${confirmError.message}`);
      // Account was created but unconfirmed — still return the id so we link roles
    } else {
      console.log(`  ✓ created + confirmed: ${email} (${userId.substring(0, 8)})`);
    }
    return userId;
  }

  // "User already registered" — find the existing user_id via our own tables
  if (signupError.message?.toLowerCase().includes('already registered') ||
      signupError.message?.toLowerCase().includes('already') ||
      signupError.message?.toLowerCase().includes('duplicate')) {

    // Check profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();
    if (profile?.user_id) {
      console.log(`  ↳ already exists (profile): ${email}`);
      return profile.user_id;
    }

    // Check employees table
    const { data: emp } = await supabase
      .from('employees')
      .select('user_id')
      .eq('email', email)
      .not('user_id', 'is', null)
      .maybeSingle();
    if (emp?.user_id) {
      console.log(`  ↳ already exists (employee): ${email}`);
      return emp.user_id;
    }

    console.log(`  ↳ already exists but id unknown: ${email} — skipping role link`);
    return null;
  }

  console.error(`  ✗ FAILED ${email}: ${signupError.message}`);
  return null;
}

async function ensureRole(userId, role) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
  if (error) console.error(`    role error for ${userId}: ${error.message}`);
}

async function ensureProfile(userId, firstName, lastName, email) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, first_name: firstName, last_name: lastName, email }, { onConflict: 'user_id' });
  if (error) console.error(`    profile error for ${userId}: ${error.message}`);
}

async function linkEmployee(employeeId, userId) {
  const { error } = await supabase
    .from('employees')
    .update({ user_id: userId })
    .eq('id', employeeId);
  if (error) console.error(`    link error for employee ${employeeId}: ${error.message}`);
}

// ---------------------------------------------------------------
async function main() {
  console.log('\n=== NAGPUR ZONE CLEAN — Auth Account Setup ===\n');

  // 1. Admin
  console.log('Creating admin account...');
  const adminId = await createOrGetUser('nmc@gmail.com', 'NMC Admin');
  if (adminId) {
    await ensureRole(adminId, 'admin');
    await ensureProfile(adminId, 'NMC', 'Admin', 'nmc@gmail.com');
    console.log('  ✓ Admin role + profile set');
  }

  // 2. Load all employees from DB
  console.log('\nFetching employees from database...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, email, employee_id')
    .not('email', 'is', null)
    .order('employee_id');

  if (empError) {
    console.error('Failed to fetch employees:', empError.message);
    process.exit(1);
  }

  console.log(`Found ${employees.length} employees. Creating auth accounts...\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const emp of employees) {
    if (!emp.email?.trim()) { skipped++; continue; }

    const email = emp.email.trim().toLowerCase();
    const nameParts = emp.name.split(' ');
    const firstName = nameParts[0] || emp.name;
    const lastName  = nameParts.slice(1).join(' ') || '';

    const uid = await createOrGetUser(email, emp.name);
    if (uid) {
      await ensureRole(uid, 'employee');
      await ensureProfile(uid, firstName, lastName, email);
      await linkEmployee(emp.id, uid);
      created++;
    } else {
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Admin:     nmc@gmail.com / ${PASSWORD}`);
  console.log(`Employees: ${employees.length} total`);
  console.log(`  Created/linked: ${employees.length - failed}`);
  console.log(`  Failed:         ${failed}`);
  console.log('\nDone! All staff can now log in at /staff-auth');
  console.log('Employee email format: firstname.lastname@nmc.gov.in\n');
}

main().catch(console.error);
