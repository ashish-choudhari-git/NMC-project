# 🏙️ Nagpur Zone Clean — Project Setup & Handover Guide

## 📋 Project Overview
Municipal complaint management system for Nagpur Municipal Corporation (NMC).
Built with: React + TypeScript + Supabase + Tailwind CSS

## 🔐 Login Credentials
| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Admin    | nmc@gmail.com       | pass@123  |
| Employee | <emp@nmc.gov.in>    | pass@123  |
| Citizen  | Self-register via app |         |

---

## 🚀 Fresh Setup on a New Supabase Project

### STEP 1 — Create Supabase Project
1. Go to https://supabase.com and create a new project
2. Note down:
   - **Project URL** → `https://xxxx.supabase.co`
   - **Anon Key** → Settings → API → `anon public`
   - **Service Role Key** → Settings → API → `service_role` (keep secret!)
   - **Project Ref** → from URL (e.g. `xxxx` in `xxxx.supabase.co`)

---

### STEP 2 — Run Migration SQL
1. Go to **Supabase Dashboard → SQL Editor**
2. Open file: `supabase/migrations/001_master_migration.sql`
3. Paste entire contents and click **Run**
4. Wait for success message ✓

This creates:
- All tables (complaints, employees, events, etc.)
- RLS policies
- Auto-assign triggers
- 12 complaint categories
- 200+ employees seed data
- Admin auth account (nmc@gmail.com / pass@123)

> ⚠️ **Note:** Employee auth accounts are NOT created here.
> They are created via the Admin Dashboard button in Step 6.

---

### STEP 3 — Configure Environment Variables
Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

Replace with your actual values from Step 1.

---

### STEP 4 — Install Dependencies
Open terminal in project folder and run:

```bash
npm install
```

---

### STEP 5 — Deploy Edge Functions
Edge functions handle employee account creation and AI features.

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy employee setup function
supabase functions deploy create-employees --no-verify-jwt

# Deploy AI assistant function
supabase functions deploy ai-assistant --no-verify-jwt
```

---

### STEP 6 — Create Employee Auth Accounts
1. Run the app locally: `npm run dev`
2. Go to `http://localhost:8080`
3. Click **"Government Login"**
4. Login with: `nmc@gmail.com` / `pass@123`
5. In Admin Dashboard, click **"Setup Employee Accounts"** button
6. Wait for success message — all 200+ employees will get login accounts

> All employees login with their `@nmc.gov.in` email and password `pass@123`

---

### STEP 7 — Run Locally
```bash
npm run dev
```
App runs at: `http://localhost:8080`

---

### STEP 8 — Build for Production
```bash
npm run build
```
Output goes to `/dist` folder — deploy this to any static host (Netlify, Vercel, etc.)

---

## 📁 Project Structure
```
├── src/
│   ├── pages/
│   │   ├── CitizenAuthPage.tsx     — Citizen login/signup
│   │   ├── StaffAuthPage.tsx       — Admin/Employee login
│   │   ├── AdminDashboard.tsx      — Admin panel
│   │   ├── EmployeeDashboard.tsx   — Employee panel
│   │   └── ...
│   ├── components/
│   │   ├── admin/                  — Admin components
│   │   └── ui/                     — Shared UI components
│   ├── hooks/
│   │   └── useAuth.tsx             — Auth hook (role detection)
│   └── integrations/
│       └── supabase/client.ts      — Supabase client config
├── supabase/
│   ├── functions/
│   │   ├── create-employees/       — Edge function: employee auth setup
│   │   └── ai-assistant/           — Edge function: AI chatbot
│   └── migrations/
│       └── 001_master_migration.sql — Complete DB setup (run this!)
└── .env                            — Your Supabase credentials (create this)
```

---

## 🗄️ Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profile info |
| `user_roles` | citizen / employee / admin roles |
| `employees` | Employee records |
| `complaints` | Citizen complaints |
| `complaint_categories` | 12 complaint categories |
| `complaint_activities` | Audit log |
| `complaint_assignments` | Complaint-employee mapping |
| `assignment_rules` | Auto-assignment rules |
| `events` | Municipal events |
| `event_registrations` | Event signups |
| `employee_encouragements` | Citizen ratings for employees |
| `contact_messages` | Contact form submissions |

---

## ⚠️ Common Issues & Fixes

### "Database error querying schema" on login
Employee/Admin auth users must be created via **Supabase Dashboard → Authentication → Users → Add User** (not via SQL directly). Then assign role via SQL:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');
```

### Edge function 401 error
Deploy with `--no-verify-jwt` flag:
```bash
supabase functions deploy create-employees --no-verify-jwt
```

### Employee accounts not linking after setup
Run this SQL to fix linking:
```sql
UPDATE public.employees e
SET user_id = u.id
FROM auth.users u
WHERE lower(u.email) = lower(e.email)
AND e.user_id IS NULL;
```

### Supabase CLI not found
Install from: https://supabase.com/docs/guides/cli

---

## 🤝 Handover Checklist
- [ ] Supabase project created
- [ ] `001_master_migration.sql` run successfully
- [ ] `.env` file configured
- [ ] Edge functions deployed
- [ ] Admin login tested (nmc@gmail.com / pass@123)
- [ ] Employee accounts setup via Admin Dashboard
- [ ] Employee login tested
- [ ] Citizen signup tested
- [ ] Complaints flow tested end-to-end

---

## 📞 Support
- Supabase Docs: https://supabase.com/docs
- Project Issues: Check browser console (F12) for detailed errors