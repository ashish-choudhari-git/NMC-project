import { createClient } from '@supabase/supabase-js';

// This script creates test accounts for development
// Run with: node --loader tsx scripts/setup-test-accounts.ts

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vcncllobjabcrxfubsvq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const accounts = [
  {
    email: 'emp1@gmail.com',
    password: 'pass@123',
    role: 'employee',
    profile: {
      first_name: 'Municipal',
      last_name: 'Employee',
      phone: '9876543210',
      address: 'NMC Office, Civil Lines, Nagpur',
    },
  },
  {
    email: 'nmc@gmail.com',
    password: 'pass@123',
    role: 'admin',
    profile: {
      first_name: 'NMC',
      last_name: 'Administrator',
      phone: '0712-1234567',
      address: 'Nagpur Municipal Corporation HQ, Nagpur',
    },
  },
];

async function setupAccount(account: typeof accounts[0]) {
  console.log(`\n📝 Setting up ${account.email} as ${account.role}...`);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true, // Auto-confirm email for testing
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log(`⚠️  User ${account.email} already exists, updating...`);
      
      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users.find(u => u.email === account.email);
      
      if (!existingUser) {
        console.error(`❌ Could not find existing user ${account.email}`);
        return;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: existingUser.id,
          email: account.email,
          ...account.profile,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error(`❌ Profile update error:`, profileError.message);
      } else {
        console.log(`✅ Profile updated for ${account.email}`);
      }

      // Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: existingUser.id,
          role: account.role,
        }, {
          onConflict: 'user_id,role',
        });

      if (roleError) {
        console.error(`❌ Role update error:`, roleError.message);
      } else {
        console.log(`✅ Role set to ${account.role} for ${account.email}`);
      }

      return;
    }

    console.error(`❌ Auth error:`, authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`✅ Auth user created with ID: ${userId}`);

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      email: account.email,
      ...account.profile,
    });

  if (profileError) {
    console.error(`❌ Profile error:`, profileError.message);
  } else {
    console.log(`✅ Profile created`);
  }

  // Assign role
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: account.role,
    });

  if (roleError) {
    console.error(`❌ Role error:`, roleError.message);
  } else {
    console.log(`✅ Role assigned: ${account.role}`);
  }
}

async function main() {
  console.log('🚀 Setting up test accounts for Mission Clean Nagpur...\n');
  console.log('Accounts to create:');
  accounts.forEach(acc => {
    console.log(`  - ${acc.email} (${acc.role})`);
  });

  for (const account of accounts) {
    await setupAccount(account);
  }

  console.log('\n✨ Setup complete!');
  console.log('\nYou can now login with:');
  accounts.forEach(acc => {
    console.log(`  ${acc.role.toUpperCase()}: ${acc.email} / ${acc.password}`);
  });
}

main().catch(console.error);
