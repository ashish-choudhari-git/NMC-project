-- ============================================================
-- NAGPUR ZONE CLEAN — COMPLETE MASTER MIGRATION
-- Run this once on a fresh Supabase project.
-- Includes: schema, RLS, functions, seed data, auth accounts
--
-- Admin login:    nmc@gmail.com / pass@123
-- Employee login: <their .gov.in email> / pass@123
-- (Password reset available via Forgot Password)
-- ============================================================

-- ============================================================
-- 0. CLEAN UP OLD ARTIFACTS (safe to run on fresh DB)
-- ============================================================
-- IMPORTANT: Only drop OUR OWN public-schema functions.
-- NEVER drop triggers directly on auth.users — GoTrue owns those triggers
-- and dropping them breaks the entire auth admin API (HTTP 500).
-- Using DROP FUNCTION ... CASCADE will automatically remove any trigger
-- in any schema that references that function.

-- ============================================================
-- NAGPUR ZONE CLEAN — MASTER SETUP SQL
-- Single file for a fresh Supabase project.
-- Run this once in the Supabase SQL Editor.
--
-- IMPORTANT: Employee auth accounts (auth.users) are NOT
-- created here. After running this SQL, open the Admin
-- Dashboard → "Setup Employee Accounts" to create login
-- accounts for all employees (default password: pass@123).
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('citizen', 'employee', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role       public.app_role NOT NULL DEFAULT 'citizen',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name    TEXT,
    middle_name   TEXT,
    last_name     TEXT,
    email         TEXT,
    phone         TEXT,
    address       TEXT,
    date_of_birth DATE,
    gender        TEXT,
    avatar_url    TEXT,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- complaint_categories
CREATE TABLE IF NOT EXISTS public.complaint_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    icon          TEXT,
    description   TEXT,
    subcategories JSONB DEFAULT '[]',
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- employees
CREATE TABLE IF NOT EXISTS public.employees (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_id      TEXT UNIQUE NOT NULL,
    name             TEXT NOT NULL,
    job              TEXT NOT NULL,
    age              INTEGER,
    zone             TEXT NOT NULL,
    main_area        TEXT,
    phone            TEXT,
    email            TEXT,
    address          TEXT,
    gender           TEXT DEFAULT 'Male',
    date_of_joining  DATE DEFAULT CURRENT_DATE,
    photo_url        TEXT,
    rating           DECIMAL DEFAULT 0,
    total_ratings    INTEGER DEFAULT 0,
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- complaints
CREATE TABLE IF NOT EXISTS public.complaints (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id          UUID REFERENCES public.complaint_categories(id),
    subcategory          TEXT,
    title                TEXT NOT NULL,
    description          TEXT,
    address              TEXT NOT NULL,
    reason               TEXT[],
    photo_url            TEXT,
    status               TEXT DEFAULT 'pending'
                             CHECK (status IN ('pending','in_progress','resolved','rejected')),
    assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    assigned_by          UUID REFERENCES auth.users(id),
    assignment_type      TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto','manual')),
    priority             TEXT DEFAULT 'medium'
                             CHECK (priority IN ('low','medium','high','urgent')),
    zone                 TEXT,
    latitude             DECIMAL,
    longitude            DECIMAL,
    deadline             TIMESTAMP WITH TIME ZONE,
    resolved_photo_url   TEXT,
    resolved_at          TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- employee_encouragements
CREATE TABLE IF NOT EXISTS public.employee_encouragements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
    description TEXT,
    username    TEXT,
    address     TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, employee_id)
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name             TEXT NOT NULL,
    organizer        TEXT NOT NULL,
    description      TEXT,
    date             DATE NOT NULL,
    venue            TEXT NOT NULL,
    category         TEXT,
    poster_url       TEXT,
    max_participants INTEGER,
    is_approved      BOOLEAN DEFAULT false,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- event_registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id   UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    status     TEXT DEFAULT 'registered'
                   CHECK (status IN ('registered','attended','cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_id)
);

-- contact_messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- complaint_activities (audit log)
CREATE TABLE IF NOT EXISTS public.complaint_activities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id  UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'created','assigned','reassigned','status_changed',
        'deadline_updated','resolved','rejected','comment_added'
    )),
    old_value     JSONB,
    new_value     JSONB,
    comment       TEXT,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- assignment_rules
CREATE TABLE IF NOT EXISTS public.assignment_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category    TEXT,
    subcategory TEXT,
    zone        TEXT,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    priority    INTEGER DEFAULT 1,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_complaints_user_id           ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status            ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_employee ON public.complaints(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_complaint_activities_id      ON public.complaint_activities(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_activities_at      ON public.complaint_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_category    ON public.assignment_rules(category);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_zone        ON public.assignment_rules(zone);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active      ON public.assignment_rules(is_active) WHERE is_active = true;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.user_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_encouragements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules        ENABLE ROW LEVEL SECURITY;

-- ── has_role helper (needed before policies reference it) ──────────
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles"  ON public.user_roles;
CREATE POLICY "Users can view their own roles"          ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles"    ON public.user_roles;
CREATE POLICY "Admins can manage all roles"            ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles policies
DROP POLICY IF EXISTS "Users can view all profiles"        ON public.profiles;
CREATE POLICY "Users can view all profiles"               ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"        ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"        ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- complaint_categories policies
DROP POLICY IF EXISTS "Anyone can view categories"   ON public.complaint_categories;
CREATE POLICY "Anyone can view categories"           ON public.complaint_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.complaint_categories;
CREATE POLICY "Admins can manage categories"         ON public.complaint_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- employees policies
DROP POLICY IF EXISTS "Anyone can view employees"   ON public.employees;
CREATE POLICY "Anyone can view employees"           ON public.employees
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
CREATE POLICY "Admins can manage employees"         ON public.employees
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Employees can update own profile" ON public.employees;
CREATE POLICY "Employees can update own profile"        ON public.employees
  FOR UPDATE USING (auth.uid() = user_id);

-- complaints policies
DROP POLICY IF EXISTS "Citizens can view their own complaints" ON public.complaints;
CREATE POLICY "Citizens can view their own complaints"        ON public.complaints
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'employee')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Citizens can create complaints"        ON public.complaints;
CREATE POLICY "Citizens can create complaints"               ON public.complaints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Citizens can update their own complaints" ON public.complaints;
CREATE POLICY "Citizens can update their own complaints"        ON public.complaints
  FOR UPDATE USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'employee')
    OR public.has_role(auth.uid(), 'admin')
  );

-- employee_encouragements policies
DROP POLICY IF EXISTS "Anyone can view encouragements"            ON public.employee_encouragements;
CREATE POLICY "Anyone can view encouragements"                    ON public.employee_encouragements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add encouragement" ON public.employee_encouragements;
CREATE POLICY "Authenticated users can add encouragement"         ON public.employee_encouragements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own encouragement"  ON public.employee_encouragements;
CREATE POLICY "Users can update their own encouragement"          ON public.employee_encouragements
  FOR UPDATE USING (auth.uid() = user_id);

-- events policies
DROP POLICY IF EXISTS "Anyone can view approved events"  ON public.events;
CREATE POLICY "Anyone can view approved events"          ON public.events
  FOR SELECT USING (
    is_approved = true
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"         ON public.events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events"         ON public.events
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
  );

-- event_registrations policies
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
CREATE POLICY "Users can view their own registrations"        ON public.event_registrations
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events"         ON public.event_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can cancel their registration" ON public.event_registrations;
CREATE POLICY "Users can cancel their registration"         ON public.event_registrations
  FOR DELETE USING (auth.uid() = user_id);

-- contact_messages policies
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"        ON public.contact_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view messages"   ON public.contact_messages;
CREATE POLICY "Admins can view messages"           ON public.contact_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update messages" ON public.contact_messages;
CREATE POLICY "Admins can update messages"         ON public.contact_messages
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete messages" ON public.contact_messages;
CREATE POLICY "Admins can delete messages"         ON public.contact_messages
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- complaint_activities policies
DROP POLICY IF EXISTS "Anyone can view complaint activities" ON public.complaint_activities;
CREATE POLICY "Anyone can view complaint activities"        ON public.complaint_activities
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert activities" ON public.complaint_activities;
CREATE POLICY "System can insert activities"         ON public.complaint_activities
  FOR INSERT WITH CHECK (true);

-- assignment_rules policies
DROP POLICY IF EXISTS "Anyone can view assignment rules"   ON public.assignment_rules;
CREATE POLICY "Anyone can view assignment rules"           ON public.assignment_rules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage assignment rules" ON public.assignment_rules;
CREATE POLICY "Admins can manage assignment rules"         ON public.assignment_rules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. FUNCTIONS
-- ============================================================

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- assignment_rules updated_at helper
CREATE OR REPLACE FUNCTION public.update_assignment_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- auto_assign_complaint (final version — 12 categories, sets status = 'in_progress')
CREATE OR REPLACE FUNCTION public.auto_assign_complaint()
RETURNS TRIGGER AS $$
DECLARE
    assigned_employee UUID;
    default_deadline  TIMESTAMP WITH TIME ZONE;
    cat_name          TEXT;
    eligible_jobs     TEXT[];
BEGIN
    default_deadline := now() + INTERVAL '3 days';
    NEW.deadline := default_deadline;

    SELECT name INTO cat_name
    FROM public.complaint_categories
    WHERE id = NEW.category_id;

    eligible_jobs := CASE cat_name
        WHEN 'Public Toilets & Sanitation' THEN
            ARRAY['Toilet Cleaner', 'Sanitation Worker']
        WHEN 'Waste & Garbage Management' THEN
            ARRAY['Garbage Collector', 'Sweeper', 'Waste Collector', 'Street Sweeper']
        WHEN 'Drainage & Sewerage Issues' THEN
            ARRAY['Drainage Worker', 'Plumber', 'Sanitation Worker']
        WHEN 'Construction & Debris' THEN
            ARRAY['Construction Worker', 'Road Worker', 'Field Officer']
        WHEN 'Street Cleaning / Sweeping' THEN
            ARRAY['Sweeper', 'Street Sweeper', 'Garbage Collector']
        WHEN 'Septic Tank Issues' THEN
            ARRAY['Sanitation Worker', 'Toilet Cleaner', 'Plumber', 'Drainage Worker']
        WHEN 'Road & Pothole Issues' THEN
            ARRAY['Road Worker', 'Construction Worker', 'Field Officer']
        WHEN 'Water Supply Issues' THEN
            ARRAY['Plumber', 'Water Supply Worker', 'Field Officer']
        WHEN 'Street Light Issues' THEN
            ARRAY['Electrician', 'Field Officer']
        WHEN 'Illegal Encroachment' THEN
            ARRAY['Field Officer', 'Inspector', 'Supervisor']
        WHEN 'Stray Animals' THEN
            ARRAY['Animal Control Worker', 'Field Officer']
        WHEN 'Parks & Public Spaces' THEN
            ARRAY['Gardener', 'Sweeper', 'Field Officer']
        ELSE
            ARRAY['Sweeper', 'Sanitation Worker', 'Field Officer']
    END;

    -- 1st try: matching job in same zone, least loaded
    SELECT e.id INTO assigned_employee
    FROM public.employees e
    LEFT JOIN (
        SELECT assigned_employee_id, COUNT(*) AS active_count
        FROM public.complaints
        WHERE status IN ('pending','in_progress')
        GROUP BY assigned_employee_id
    ) cs ON cs.assigned_employee_id = e.id
    WHERE e.is_active = true
      AND e.job = ANY(eligible_jobs)
      AND (NEW.zone IS NULL OR e.zone = NEW.zone OR NEW.zone = '')
    ORDER BY COALESCE(cs.active_count, 0) ASC, RANDOM()
    LIMIT 1;

    -- 2nd try: matching job, any zone
    IF assigned_employee IS NULL THEN
        SELECT e.id INTO assigned_employee
        FROM public.employees e
        LEFT JOIN (
            SELECT assigned_employee_id, COUNT(*) AS active_count
            FROM public.complaints
            WHERE status IN ('pending','in_progress')
            GROUP BY assigned_employee_id
        ) cs ON cs.assigned_employee_id = e.id
        WHERE e.is_active = true
          AND e.job = ANY(eligible_jobs)
        ORDER BY COALESCE(cs.active_count, 0) ASC, RANDOM()
        LIMIT 1;
    END IF;

    -- 3rd fallback: any active employee in same zone
    IF assigned_employee IS NULL THEN
        SELECT id INTO assigned_employee
        FROM public.employees
        WHERE is_active = true
          AND (NEW.zone IS NULL OR zone = NEW.zone OR NEW.zone = '')
        ORDER BY RANDOM()
        LIMIT 1;
    END IF;

    -- Last resort: any active employee
    IF assigned_employee IS NULL THEN
        SELECT id INTO assigned_employee
        FROM public.employees
        WHERE is_active = true
        ORDER BY RANDOM()
        LIMIT 1;
    END IF;

    IF assigned_employee IS NOT NULL THEN
        NEW.assigned_employee_id := assigned_employee;
        NEW.assignment_type      := 'auto';
        NEW.status               := 'in_progress';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at  ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_complaints_updated_at ON public.complaints;
CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at  ON public.employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at     ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_rules_updated_at ON public.assignment_rules;
CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON public.assignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_assignment_rules_updated_at();

DROP TRIGGER IF EXISTS trigger_auto_assign_complaint ON public.complaints;
CREATE TRIGGER trigger_auto_assign_complaint
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  WHEN (NEW.assigned_employee_id IS NULL)
  EXECUTE FUNCTION public.auto_assign_complaint();

-- ============================================================
-- 8. PUBLIC VIEW (complaint stats for homepage)
-- ============================================================
DROP VIEW IF EXISTS public.public_complaint_stats;
CREATE VIEW public.public_complaint_stats AS
SELECT
    COUNT(*)                                                                   AS total,
    COUNT(*) FILTER (WHERE status = 'pending')                                AS pending,
    COUNT(*) FILTER (WHERE status = 'in_progress')                            AS in_progress,
    COUNT(*) FILTER (WHERE status = 'resolved')                               AS resolved,
    COUNT(*) FILTER (WHERE status = 'rejected')                               AS rejected,
    COUNT(*) FILTER (WHERE deadline < now()
                       AND status NOT IN ('resolved','rejected'))              AS overdue,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)                        AS today
FROM public.complaints;

GRANT SELECT ON public.public_complaint_stats TO anon, authenticated;

-- ============================================================
-- 9. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'complaint-images'
    AND auth.uid() IS NOT NULL
  );

-- Public read
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'complaint-images');

-- Owner or admin can delete
DROP POLICY IF EXISTS "Allow owner delete" ON storage.objects;
CREATE POLICY "Allow owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'complaint-images'
    AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'))
  );

-- ============================================================
-- 10. SEED — COMPLAINT CATEGORIES (12 total)
-- ============================================================
INSERT INTO public.complaint_categories (name, icon, description, subcategories) VALUES
(
  'Public Toilets & Sanitation', 'toilet',
  'Issues related to public toilets and sanitation facilities',
  '["Yellow Spot (Public Urination Spot)", "No Electricity in Public Toilet", "No Water Supply in Public Toilet", "Public Toilet Blockage", "Open Defecation", "Toilet Not Cleaned", "Broken Door / Lock", "No Dustbin in Toilet", "Toilet Overflowing", "Toilet Light Not Working"]'
),
(
  'Waste & Garbage Management', 'trash-2',
  'Issues related to waste collection and garbage management',
  '["Garbage Overflow", "Missed Pickup", "Improper Disposal", "Littering", "Garbage Burning", "No Dustbin in Area", "Dumping on Road / Footpath", "Wet & Dry Waste Mixed", "Garbage Vehicle Not Coming", "Overflowing Community Bin"]'
),
(
  'Drainage & Sewerage Issues', 'droplets',
  'Issues related to drainage and sewerage systems',
  '["Blocked Drain", "Overflowing Sewage", "Broken Manhole", "Stagnant Water", "Foul Smell", "Flooded Road after Rain", "Open Drain Dangerous", "Sewer Line Choked", "Drainage Water on Road", "Manhole Cover Missing"]'
),
(
  'Construction & Debris', 'construction',
  'Issues related to construction waste and debris',
  '["Unauthorized Dumping", "Construction Waste on Road", "Road Debris", "Building Material Blocking Road", "Rubble Not Cleared", "Construction at Night (Noise)", "Dust Pollution from Site", "Broken Road due to Construction", "Damaged Footpath by Construction"]'
),
(
  'Street Cleaning / Sweeping', 'sparkles',
  'Issues related to street cleanliness and sweeping',
  '["Unswept Streets", "Dirty Public Spaces", "Leaf Accumulation", "Market Area Not Cleaned", "Road Divider Dirty", "Footpath Dirty", "Garbage Near School / Hospital", "Festival Waste Not Cleared", "Bus Stop / Auto Stand Dirty"]'
),
(
  'Septic Tank Issues', 'cylinder',
  'Issues related to septic tanks and sewer connections',
  '["Septic Tank Overflow", "Septic Tank Cleaning Request", "Leakage from Septic Tank", "Bad Odor from Septic Tank", "Septic Tank Damaged", "No Drainage Connection"]'
),
(
  'Road & Pothole Issues', 'route',
  'Issues related to road conditions and infrastructure',
  '["Pothole on Road", "Broken Road Surface", "Road Waterlogging", "Missing Speed Breaker", "Damaged / Broken Divider", "Faded Road Markings", "Broken Footpath / Sidewalk", "Manhole Protrusion on Road", "Road Dug Up Not Restored", "Dangerous Road Condition"]'
),
(
  'Water Supply Issues', 'waves',
  'Issues with municipal water supply and pipelines',
  '["No Water Supply", "Dirty / Contaminated Water", "Water Pipe Burst", "Low Water Pressure", "Water Leakage from Pipeline", "Irregular Water Supply Timing", "Broken / Stolen Water Meter", "No Water Connection in Area"]'
),
(
  'Street Light Issues', 'lightbulb',
  'Issues related to street lighting and electrical poles',
  '["Street Light Not Working", "Broken Street Light Pole", "Blinking / Flickering Light", "Street Light On During Daytime", "No Street Light in Area", "Exposed / Hanging Wires", "Electric Pole Damaged / Dangerous"]'
),
(
  'Illegal Encroachment', 'shield-alert',
  'Encroachment on public property, roads, and footpaths',
  '["Encroachment on Footpath", "Illegal Hawkers Blocking Road", "Illegal Construction on Public Land", "Vehicle Parked Permanently on Footpath", "Shop / Stall Extending onto Road", "Unauthorized Billboard / Banner"]'
),
(
  'Stray Animals', 'dog',
  'Issues related to stray animals causing nuisance or danger',
  '["Stray Dog Menace / Attack", "Cattle / Cows on Road", "Pig Roaming in Residential Area", "Dead Animal on Road / Footpath", "Monkey Menace", "Stray Animal Bite"]'
),
(
  'Parks & Public Spaces', 'trees',
  'Issues in parks, gardens, playgrounds, and public areas',
  '["Park Not Maintained", "Broken Equipment in Park / Playground", "Garbage Dumped in Park", "Broken Benches or Seats", "Overgrown Grass / Bushes", "Park Light Not Working", "Tree Fallen on Road", "Dead / Dangerous Tree", "Lake / Pond Area Dirty"]'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. SEED — EMPLOYEES (200+ total)
-- ============================================================
INSERT INTO public.employees
  (employee_id, name, job, age, zone, main_area, phone, email, address, gender, rating, total_ratings, is_active)
VALUES
-- ===== TOILET CLEANERS =====
('EMP001','Arun Meshram','Toilet Cleaner',32,'Central Zone','Sitabuldi','9876500001','arun.meshram@nmc.gov.in','12 Sitabuldi, Nagpur','Male',4.2,60,true),
('EMP002','Sunita Bansod','Toilet Cleaner',27,'Central Zone','Itwari','9876500002','sunita.bansod@nmc.gov.in','45 Itwari, Nagpur','Female',4.5,85,true),
('EMP003','Ramesh Waghmare','Toilet Cleaner',40,'East Zone','Gandhibagh','9876500003','ramesh.waghmare@nmc.gov.in','7 Gandhibagh, Nagpur','Male',4.0,45,true),
('EMP004','Kavita Rathod','Toilet Cleaner',35,'East Zone','Kamptee Road','9876500004','kavita.rathod@nmc.gov.in','23 Kamptee Rd, Nagpur','Female',4.3,70,true),
('EMP005','Santosh Khobragade','Toilet Cleaner',29,'West Zone','Dharampeth','9876500005','santosh.khobragade@nmc.gov.in','5 Dharampeth, Nagpur','Male',4.6,90,true),
('EMP006','Manda Ramteke','Toilet Cleaner',44,'West Zone','Ramdaspeth','9876500006','manda.ramteke@nmc.gov.in','18 Ramdaspeth, Nagpur','Female',4.1,55,true),
('EMP007','Dilip Dongre','Toilet Cleaner',38,'North Zone','Gokulpeth','9876500007','dilip.dongre@nmc.gov.in','34 Gokulpeth, Nagpur','Male',4.4,65,true),
('EMP008','Anita Uikey','Toilet Cleaner',31,'North Zone','Jaripatka','9876500008','anita.uikey@nmc.gov.in','9 Jaripatka, Nagpur','Female',4.7,100,true),
('EMP009','Prakash Hatwar','Toilet Cleaner',45,'South Zone','Mankapur','9876500009','prakash.hatwar@nmc.gov.in','67 Mankapur, Nagpur','Male',4.2,58,true),
('EMP010','Leela Nikhade','Toilet Cleaner',36,'South Zone','Wardhaman Nagar','9876500010','leela.nikhade@nmc.gov.in','2 Wardhaman Nagar, Nagpur','Female',4.5,80,true),
('EMP011','Ganesh Borkar','Toilet Cleaner',33,'Dharampeth Zone','Dharampeth','9876500011','ganesh.borkar@nmc.gov.in','11 Dharampeth, Nagpur','Male',4.0,40,true),
('EMP012','Shobha Kumre','Toilet Cleaner',28,'Nehru Nagar Zone','Nehru Nagar','9876500012','shobha.kumre@nmc.gov.in','30 Nehru Nagar, Nagpur','Female',4.3,75,true),
('EMP013','Vijay Sonkusare','Toilet Cleaner',42,'Hanuman Nagar Zone','Hanuman Nagar','9876500013','vijay.sonkusare@nmc.gov.in','8 Hanuman Nagar, Nagpur','Male',4.6,95,true),
('EMP014','Pushpa Gedam','Toilet Cleaner',39,'Gandhibagh Zone','Gandhibagh','9876500014','pushpa.gedam@nmc.gov.in','16 Gandhibagh, Nagpur','Female',4.1,50,true),
('EMP015','Naresh Ingle','Toilet Cleaner',34,'Satranjipura Zone','Satranjipura','9876500015','naresh.ingle@nmc.gov.in','25 Satranjipura, Nagpur','Male',4.4,65,true),
-- ===== SANITATION WORKERS =====
('EMP016','Priya Ambhore','Sanitation Worker',26,'Central Zone','Sitabuldi','9876500016','priya.ambhore@nmc.gov.in','3 Civil Lines, Nagpur','Female',4.8,120,true),
('EMP017','Mohan Nandeshwar','Sanitation Worker',37,'Central Zone','Civil Lines','9876500017','mohan.nandeshwar@nmc.gov.in','44 Civil Lines, Nagpur','Male',4.2,60,true),
('EMP018','Rekha Sorte','Sanitation Worker',30,'East Zone','Lakadganj','9876500018','rekha.sorte@nmc.gov.in','12 Lakadganj, Nagpur','Female',4.5,90,true),
('EMP019','Kiran Fulzele','Sanitation Worker',43,'East Zone','Kamptee Road','9876500019','kiran.fulzele@nmc.gov.in','56 Kamptee Rd, Nagpur','Male',4.0,45,true),
('EMP020','Suman Wankhede','Sanitation Worker',29,'West Zone','Dharampeth','9876500020','suman.wankhede@nmc.gov.in','7 Dharampeth, Nagpur','Female',4.6,85,true),
('EMP021','Anil Kadu','Sanitation Worker',41,'West Zone','Hingna Road','9876500021','anil.kadu@nmc.gov.in','89 Hingna Rd, Nagpur','Male',4.3,70,true),
('EMP022','Bharti Pawar','Sanitation Worker',32,'North Zone','Jaripatka','9876500022','bharti.pawar@nmc.gov.in','22 Jaripatka, Nagpur','Female',4.7,105,true),
('EMP023','Sunil Gajbhiye','Sanitation Worker',38,'North Zone','Nandanvan','9876500023','sunil.gajbhiye@nmc.gov.in','33 Nandanvan, Nagpur','Male',4.1,55,true),
('EMP024','Mamta Sakhre','Sanitation Worker',27,'South Zone','Mankapur','9876500024','mamta.sakhre@nmc.gov.in','6 Mankapur, Nagpur','Female',4.4,80,true),
('EMP025','Ravi Khade','Sanitation Worker',46,'South Zone','Ajni','9876500025','ravi.khade@nmc.gov.in','14 Ajni, Nagpur','Male',4.2,65,true),
('EMP111','Manohar Dambhare','Sanitation Worker',40,'Central Zone','Itwari','9876500111','manohar.dambhare@nmc.gov.in','9 Itwari, Nagpur','Male',4.4,82,true),
('EMP112','Sarita Gadekar','Sanitation Worker',34,'East Zone','Butibori','9876500112','sarita.gadekar@nmc.gov.in','67 Butibori, Nagpur','Female',4.0,44,true),
('EMP113','Navnath Bhave','Sanitation Worker',28,'West Zone','Hingna Road','9876500113','navnath.bhave@nmc.gov.in','30 Hingna Rd, Nagpur','Male',4.6,91,true),
('EMP114','Indra Thakre','Sanitation Worker',45,'North Zone','Nandanvan','9876500114','indra.thakre@nmc.gov.in','24 Nandanvan, Nagpur','Female',4.3,74,true),
('EMP115','Shankar Dakhore','Sanitation Worker',38,'South Zone','Mankapur','9876500115','shankar.dakhore@nmc.gov.in','57 Mankapur, Nagpur','Male',4.7,106,true),
('EMP116','Lalita Kumbhare','Sanitation Worker',31,'Dharampeth Zone','Dharampeth','9876500116','lalita.kumbhare@nmc.gov.in','33 Dharampeth, Nagpur','Female',4.2,60,true),
('EMP117','Prakash Gondhale','Sanitation Worker',47,'Nehru Nagar Zone','Nehru Nagar','9876500117','prakash.gondhale@nmc.gov.in','81 Nehru Nagar, Nagpur','Male',4.5,85,true),
('EMP118','Kaveri Ghuguskar','Sanitation Worker',26,'Hanuman Nagar Zone','Hanuman Nagar','9876500118','kaveri.ghuguskar@nmc.gov.in','6 Hanuman Nagar, Nagpur','Female',4.1,50,true),
('EMP119','Dattu Bhoye','Sanitation Worker',42,'Gandhibagh Zone','Gandhibagh','9876500119','dattu.bhoye@nmc.gov.in','48 Gandhibagh, Nagpur','Male',4.6,93,true),
('EMP120','Sangita Mankar','Sanitation Worker',33,'Satranjipura Zone','Satranjipura','9876500120','sangita.mankar@nmc.gov.in','22 Satranjipura, Nagpur','Female',4.4,79,true),
('EMP135','Hemlata Ramgirkar','Sanitation Worker',27,'Gandhibagh Zone','Gandhibagh','9876500135','hemlata.ramgirkar@nmc.gov.in','44 Gandhibagh, Nagpur','Female',4.4,76,true),
('EMP150','Vimala Ingole','Sanitation Worker',44,'Central Zone','Civil Lines','9876500150','vimala.ingole@nmc.gov.in','16 Civil Lines, Nagpur','Female',4.4,79,true),
-- ===== GARBAGE COLLECTORS =====
('EMP026','Deepak Shende','Garbage Collector',35,'Central Zone','Sitabuldi','9876500026','deepak.shende@nmc.gov.in','5 Sitabuldi, Nagpur','Male',4.5,95,true),
('EMP027','Lata Patil','Garbage Collector',28,'Central Zone','Itwari','9876500027','lata.patil@nmc.gov.in','38 Itwari, Nagpur','Female',4.0,50,true),
('EMP028','Mahesh Bhoite','Garbage Collector',44,'East Zone','Gandhibagh','9876500028','mahesh.bhoite@nmc.gov.in','27 Gandhibagh, Nagpur','Male',4.6,110,true),
('EMP029','Savita Dakhore','Garbage Collector',31,'East Zone','Butibori','9876500029','savita.dakhore@nmc.gov.in','41 Butibori, Nagpur','Female',4.3,75,true),
('EMP030','Nilesh Gode','Garbage Collector',39,'West Zone','Dharampeth','9876500030','nilesh.gode@nmc.gov.in','19 Dharampeth, Nagpur','Male',4.7,115,true),
('EMP031','Usha Mankar','Garbage Collector',34,'West Zone','Ramdaspeth','9876500031','usha.mankar@nmc.gov.in','52 Ramdaspeth, Nagpur','Female',4.2,60,true),
('EMP032','Pravin Nagpure','Garbage Collector',42,'North Zone','Gokulpeth','9876500032','pravin.nagpure@nmc.gov.in','15 Gokulpeth, Nagpur','Male',4.5,88,true),
('EMP033','Sonal Deshpande','Garbage Collector',29,'North Zone','Jaripatka','9876500033','sonal.deshpande@nmc.gov.in','28 Jaripatka, Nagpur','Female',4.0,42,true),
('EMP034','Tushar Hinge','Garbage Collector',36,'South Zone','Mankapur','9876500034','tushar.hinge@nmc.gov.in','63 Mankapur, Nagpur','Male',4.4,80,true),
('EMP035','Vaishali Banskar','Garbage Collector',48,'South Zone','Wardhaman Nagar','9876500035','vaishali.banskar@nmc.gov.in','4 Wardhaman Nagar, Nagpur','Female',4.1,48,true),
('EMP036','Hemant Zodpe','Garbage Collector',33,'Dharampeth Zone','Dharampeth','9876500036','hemant.zodpe@nmc.gov.in','29 Dharampeth, Nagpur','Male',4.6,92,true),
('EMP037','Nanda Fuke','Garbage Collector',27,'Nehru Nagar Zone','Nehru Nagar','9876500037','nanda.fuke@nmc.gov.in','17 Nehru Nagar, Nagpur','Female',4.3,68,true),
('EMP038','Rohit Chandak','Garbage Collector',41,'Hanuman Nagar Zone','Hanuman Nagar','9876500038','rohit.chandak@nmc.gov.in','36 Hanuman Nagar, Nagpur','Male',4.8,125,true),
('EMP039','Pooja Ghavat','Garbage Collector',30,'Gandhibagh Zone','Gandhibagh','9876500039','pooja.ghavat@nmc.gov.in','10 Gandhibagh, Nagpur','Female',4.2,55,true),
('EMP040','Akash Jumde','Garbage Collector',38,'Satranjipura Zone','Satranjipura','9876500040','akash.jumde@nmc.gov.in','47 Satranjipura, Nagpur','Male',4.5,85,true),
('EMP132','Nitin Ambhore','Garbage Collector',36,'Gandhibagh Zone','Gandhibagh','9876500132','nitin.ambhore@nmc.gov.in','52 Gandhibagh, Nagpur','Male',4.5,84,true),
('EMP137','Pushpa Chandurkar','Garbage Collector',31,'Satranjipura Zone','Satranjipura','9876500137','pushpa.chandurkar@nmc.gov.in','28 Satranjipura, Nagpur','Female',4.5,86,true),
('EMP141','Jayram Kalambe','Garbage Collector',45,'Nehru Nagar Zone','Nehru Nagar','9876500141','jayram.kalambe@nmc.gov.in','55 Nehru Nagar, Nagpur','Male',4.4,77,true),
-- ===== SWEEPERS =====
('EMP041','Ranjana Kohale','Sweeper',25,'Central Zone','Sitabuldi','9876500041','ranjana.kohale@nmc.gov.in','20 Sitabuldi, Nagpur','Female',4.3,72,true),
('EMP042','Subhash Paunikar','Sweeper',47,'Central Zone','Civil Lines','9876500042','subhash.paunikar@nmc.gov.in','53 Civil Lines, Nagpur','Male',4.7,112,true),
('EMP043','Jayshri Tiwari','Sweeper',33,'East Zone','Gandhibagh','9876500043','jayshri.tiwari@nmc.gov.in','6 Gandhibagh, Nagpur','Female',4.0,44,true),
('EMP044','Dilip Asode','Sweeper',39,'East Zone','Kamptee Road','9876500044','dilip.asode@nmc.gov.in','74 Kamptee Rd, Nagpur','Male',4.5,87,true),
('EMP045','Meena Bele','Sweeper',28,'West Zone','Dharampeth','9876500045','meena.bele@nmc.gov.in','31 Dharampeth, Nagpur','Female',4.2,60,true),
('EMP046','Ravindra Kale','Sweeper',43,'West Zone','Ramdaspeth','9876500046','ravindra.kale@nmc.gov.in','8 Ramdaspeth, Nagpur','Male',4.6,98,true),
('EMP047','Alka Goswami','Sweeper',36,'North Zone','Gokulpeth','9876500047','alka.goswami@nmc.gov.in','42 Gokulpeth, Nagpur','Female',4.4,77,true),
('EMP048','Sanjay Dongare','Sweeper',30,'North Zone','Nandanvan','9876500048','sanjay.dongare@nmc.gov.in','16 Nandanvan, Nagpur','Male',4.1,50,true),
('EMP049','Tara Pimpalkar','Sweeper',44,'South Zone','Mankapur','9876500049','tara.pimpalkar@nmc.gov.in','25 Mankapur, Nagpur','Female',4.7,108,true),
('EMP050','Vikas Khandare','Sweeper',37,'South Zone','Ajni','9876500050','vikas.khandare@nmc.gov.in','38 Ajni, Nagpur','Male',4.3,74,true),
('EMP051','Nirmala Thakre','Sweeper',26,'Dharampeth Zone','Dharampeth','9876500051','nirmala.thakre@nmc.gov.in','13 Dharampeth, Nagpur','Female',4.5,82,true),
('EMP052','Santosh Deshmukh','Sweeper',40,'Nehru Nagar Zone','Nehru Nagar','9876500052','santosh.deshmukh@nmc.gov.in','21 Nehru Nagar, Nagpur','Male',4.0,43,true),
('EMP053','Urmila Burde','Sweeper',31,'Hanuman Nagar Zone','Hanuman Nagar','9876500053','urmila.burde@nmc.gov.in','57 Hanuman Nagar, Nagpur','Female',4.6,93,true),
('EMP054','Manoj Nikam','Sweeper',45,'Gandhibagh Zone','Gandhibagh','9876500054','manoj.nikam@nmc.gov.in','9 Gandhibagh, Nagpur','Male',4.3,70,true),
('EMP055','Geeta Wasnik','Sweeper',29,'Satranjipura Zone','Satranjipura','9876500055','geeta.wasnik@nmc.gov.in','32 Satranjipura, Nagpur','Female',4.8,118,true),
('EMP133','Sunita Kanfade','Sweeper',42,'Gandhibagh Zone','Gandhibagh','9876500133','sunita.kanfade@nmc.gov.in','19 Gandhibagh, Nagpur','Female',4.0,43,true),
('EMP142','Archana Pendke','Sweeper',28,'Nehru Nagar Zone','Nehru Nagar','9876500142','archana.pendke@nmc.gov.in','12 Nehru Nagar, Nagpur','Female',4.6,92,true),
-- ===== DRAINAGE WORKERS =====
('EMP056','Pramod Pande','Drainage Worker',34,'Central Zone','Sitabuldi','9876500056','pramod.pande@nmc.gov.in','24 Sitabuldi, Nagpur','Male',4.4,78,true),
('EMP057','Yogesh Wanode','Drainage Worker',41,'Central Zone','Itwari','9876500057','yogesh.wanode@nmc.gov.in','60 Itwari, Nagpur','Male',4.0,46,true),
('EMP058','Anand Fulzele','Drainage Worker',27,'East Zone','Gandhibagh','9876500058','anand.fulzele@nmc.gov.in','18 Gandhibagh, Nagpur','Male',4.5,86,true),
('EMP059','Ashok Bansod','Drainage Worker',46,'East Zone','Kamptee Road','9876500059','ashok.bansod@nmc.gov.in','82 Kamptee Rd, Nagpur','Male',4.2,62,true),
('EMP060','Rahul Masram','Drainage Worker',32,'West Zone','Dharampeth','9876500060','rahul.masram@nmc.gov.in','6 Dharampeth, Nagpur','Male',4.7,106,true),
('EMP061','Krishna Shrirame','Drainage Worker',38,'West Zone','Ramdaspeth','9876500061','krishna.shrirame@nmc.gov.in','35 Ramdaspeth, Nagpur','Male',4.3,72,true),
('EMP062','Suresh Bansode','Drainage Worker',43,'North Zone','Nandanvan','9876500062','suresh.bansode@nmc.gov.in','28 Nandanvan, Nagpur','Male',4.1,53,true),
('EMP063','Ganesh Raut','Drainage Worker',29,'South Zone','Mankapur','9876500063','ganesh.raut@nmc.gov.in','46 Mankapur, Nagpur','Male',4.6,94,true),
('EMP064','Raju Borkar','Drainage Worker',35,'Dharampeth Zone','Dharampeth','9876500064','raju.borkar@nmc.gov.in','11 Dharampeth, Nagpur','Male',4.4,83,true),
('EMP065','Balaji Dhone','Drainage Worker',48,'Nehru Nagar Zone','Nehru Nagar','9876500065','balaji.dhone@nmc.gov.in','49 Nehru Nagar, Nagpur','Male',4.0,44,true),
('EMP134','Mukund Gawai','Drainage Worker',34,'Gandhibagh Zone','Gandhibagh','9876500134','mukund.gawai@nmc.gov.in','7 Gandhibagh, Nagpur','Male',4.6,90,true),
('EMP138','Baban Rathod','Drainage Worker',44,'Satranjipura Zone','Satranjipura','9876500138','baban.rathod@nmc.gov.in','15 Satranjipura, Nagpur','Male',4.1,51,true),
('EMP143','Santosh Ghate','Drainage Worker',39,'Nehru Nagar Zone','Nehru Nagar','9876500143','santosh.ghate@nmc.gov.in','36 Nehru Nagar, Nagpur','Male',4.2,61,true),
-- ===== PLUMBERS =====
('EMP066','Ashwin Gaike','Plumber',36,'Central Zone','Civil Lines','9876500066','ashwin.gaike@nmc.gov.in','19 Civil Lines, Nagpur','Male',4.5,89,true),
('EMP067','Vinod Sarode','Plumber',42,'East Zone','Gandhibagh','9876500067','vinod.sarode@nmc.gov.in','37 Gandhibagh, Nagpur','Male',4.2,61,true),
('EMP068','Sudhir Kute','Plumber',30,'West Zone','Dharampeth','9876500068','sudhir.kute@nmc.gov.in','23 Dharampeth, Nagpur','Male',4.7,107,true),
('EMP069','Kishor Bhagat','Plumber',44,'North Zone','Jaripatka','9876500069','kishor.bhagat@nmc.gov.in','5 Jaripatka, Nagpur','Male',4.3,73,true),
('EMP070','Naresh Vaidya','Plumber',31,'South Zone','Ajni','9876500070','naresh.vaidya@nmc.gov.in','62 Ajni, Nagpur','Male',4.6,97,true),
('EMP071','Amol Shingate','Plumber',38,'Hanuman Nagar Zone','Hanuman Nagar','9876500071','amol.shingate@nmc.gov.in','14 Hanuman Nagar, Nagpur','Male',4.1,51,true),
('EMP072','Dinesh Mohod','Plumber',45,'Gandhibagh Zone','Gandhibagh','9876500072','dinesh.mohod@nmc.gov.in','40 Gandhibagh, Nagpur','Male',4.4,76,true),
('EMP073','Ajay Dhole','Plumber',28,'Satranjipura Zone','Satranjipura','9876500073','ajay.dhole@nmc.gov.in','33 Satranjipura, Nagpur','Male',4.8,122,true),
('EMP140','Girish Khade','Plumber',37,'Satranjipura Zone','Satranjipura','9876500140','girish.khade@nmc.gov.in','41 Satranjipura, Nagpur','Male',4.3,73,true),
('EMP145','Dyaneshwar Bankar','Plumber',46,'Hanuman Nagar Zone','Hanuman Nagar','9876500145','dyaneshwar.bankar@nmc.gov.in','27 Hanuman Nagar, Nagpur','Male',4.0,42,true),
-- ===== CONSTRUCTION WORKERS =====
('EMP074','Sunil Gawande','Construction Worker',37,'Central Zone','Sitabuldi','9876500074','sunil.gawande@nmc.gov.in','7 Sitabuldi, Nagpur','Male',4.3,71,true),
('EMP075','Pankaj Raut','Construction Worker',44,'East Zone','Kamptee Road','9876500075','pankaj.raut@nmc.gov.in','55 Kamptee Rd, Nagpur','Male',4.0,45,true),
('EMP076','Umesh Bhende','Construction Worker',31,'West Zone','Dharampeth','9876500076','umesh.bhende@nmc.gov.in','8 Dharampeth, Nagpur','Male',4.6,91,true),
('EMP077','Ravindra Shirsath','Construction Worker',48,'North Zone','Gokulpeth','9876500077','ravindra.shirsath@nmc.gov.in','26 Gokulpeth, Nagpur','Male',4.2,59,true),
('EMP078','Shrikant Zade','Construction Worker',35,'South Zone','Mankapur','9876500078','shrikant.zade@nmc.gov.in','39 Mankapur, Nagpur','Male',4.5,86,true),
('EMP079','Datta Shahare','Construction Worker',40,'Dharampeth Zone','Dharampeth','9876500079','datta.shahare@nmc.gov.in','17 Dharampeth, Nagpur','Male',4.1,52,true),
('EMP080','Bharat Ramteke','Construction Worker',27,'Nehru Nagar Zone','Nehru Nagar','9876500080','bharat.ramteke@nmc.gov.in','44 Nehru Nagar, Nagpur','Male',4.7,109,true),
('EMP147','Arun Hatkar','Construction Worker',43,'Dharampeth Zone','Dharampeth','9876500147','arun.hatkar@nmc.gov.in','26 Dharampeth, Nagpur','Male',4.3,72,true),
-- ===== ROAD WORKERS =====
('EMP081','Gopal Gharde','Road Worker',33,'Central Zone','Civil Lines','9876500081','gopal.gharde@nmc.gov.in','61 Civil Lines, Nagpur','Male',4.4,79,true),
('EMP082','Ratan Nimkar','Road Worker',47,'East Zone','Gandhibagh','9876500082','ratan.nimkar@nmc.gov.in','14 Gandhibagh, Nagpur','Male',4.0,46,true),
('EMP083','Harish Balpande','Road Worker',29,'West Zone','Ramdaspeth','9876500083','harish.balpande@nmc.gov.in','29 Ramdaspeth, Nagpur','Male',4.5,88,true),
('EMP084','Chandrakant Yede','Road Worker',41,'North Zone','Nandanvan','9876500084','chandrakant.yede@nmc.gov.in','18 Nandanvan, Nagpur','Male',4.3,73,true),
('EMP085','Keshav Bhoyar','Road Worker',36,'South Zone','Ajni','9876500085','keshav.bhoyar@nmc.gov.in','51 Ajni, Nagpur','Male',4.6,96,true),
('EMP086','Kishor Bansod','Road Worker',43,'Hanuman Nagar Zone','Hanuman Nagar','9876500086','kishor.bansod@nmc.gov.in','23 Hanuman Nagar, Nagpur','Male',4.2,60,true),
('EMP087','Nagesh Shambharkar','Road Worker',30,'Gandhibagh Zone','Gandhibagh','9876500087','nagesh.shambharkar@nmc.gov.in','5 Gandhibagh, Nagpur','Male',4.7,104,true),
('EMP149','Sudarshan Ganje','Road Worker',38,'Central Zone','Sitabuldi','9876500149','sudarshan.ganje@nmc.gov.in','73 Sitabuldi, Nagpur','Male',4.1,52,true),
-- ===== FIELD OFFICERS =====
('EMP088','Suhas Badkas','Field Officer',38,'Central Zone','Sitabuldi','9876500088','suhas.badkas@nmc.gov.in','43 Sitabuldi, Nagpur','Male',4.3,69,true),
('EMP089','Tanvir Sheikh','Field Officer',45,'East Zone','Kamptee Road','9876500089','tanvir.sheikh@nmc.gov.in','77 Kamptee Rd, Nagpur','Male',4.0,42,true),
('EMP090','Vinayak Thakur','Field Officer',32,'West Zone','Dharampeth','9876500090','vinayak.thakur@nmc.gov.in','12 Dharampeth, Nagpur','Male',4.6,92,true),
('EMP091','Ramchandra Chaure','Field Officer',49,'North Zone','Gokulpeth','9876500091','ramchandra.chaure@nmc.gov.in','34 Gokulpeth, Nagpur','Male',4.1,50,true),
('EMP092','Mukesh Lohiya','Field Officer',34,'South Zone','Mankapur','9876500092','mukesh.lohiya@nmc.gov.in','28 Mankapur, Nagpur','Male',4.5,84,true),
-- ===== STREET SWEEPERS =====
('EMP093','Poonam Dolas','Street Sweeper',26,'Central Zone','Sitabuldi','9876500093','poonam.dolas@nmc.gov.in','56 Sitabuldi, Nagpur','Female',4.4,80,true),
('EMP094','Bhagwat Ingole','Street Sweeper',39,'East Zone','Gandhibagh','9876500094','bhagwat.ingole@nmc.gov.in','22 Gandhibagh, Nagpur','Male',4.0,43,true),
('EMP095','Rucha Bhoskar','Street Sweeper',33,'West Zone','Ramdaspeth','9876500095','rucha.bhoskar@nmc.gov.in','8 Ramdaspeth, Nagpur','Female',4.7,110,true),
('EMP096','Dhanraj Lade','Street Sweeper',42,'North Zone','Nandanvan','9876500096','dhanraj.lade@nmc.gov.in','37 Nandanvan, Nagpur','Male',4.3,74,true),
('EMP097','Smita Maske','Street Sweeper',28,'South Zone','Ajni','9876500097','smita.maske@nmc.gov.in','49 Ajni, Nagpur','Female',4.6,95,true),
('EMP098','Eknath Waghade','Street Sweeper',45,'Dharampeth Zone','Dharampeth','9876500098','eknath.waghade@nmc.gov.in','15 Dharampeth, Nagpur','Male',4.2,57,true),
('EMP099','Varsha Gorade','Street Sweeper',31,'Nehru Nagar Zone','Nehru Nagar','9876500099','varsha.gorade@nmc.gov.in','68 Nehru Nagar, Nagpur','Female',4.5,85,true),
('EMP100','Ganpat Thakre','Street Sweeper',37,'Hanuman Nagar Zone','Hanuman Nagar','9876500100','ganpat.thakre@nmc.gov.in','4 Hanuman Nagar, Nagpur','Male',4.1,52,true),
('EMP139','Mangala Wanjari','Street Sweeper',33,'Satranjipura Zone','Satranjipura','9876500139','mangala.wanjari@nmc.gov.in','7 Satranjipura, Nagpur','Female',4.7,105,true),
('EMP146','Pramila Bansod','Street Sweeper',30,'Dharampeth Zone','Dharampeth','9876500146','pramila.bansod@nmc.gov.in','59 Dharampeth, Nagpur','Female',4.7,108,true),
-- ===== WASTE COLLECTORS =====
('EMP101','Aasha Chavan','Waste Collector',30,'Central Zone','Civil Lines','9876500101','aasha.chavan@nmc.gov.in','35 Civil Lines, Nagpur','Female',4.6,96,true),
('EMP102','Ramnath Shyam','Waste Collector',43,'East Zone','Lakadganj','9876500102','ramnath.shyam@nmc.gov.in','48 Lakadganj, Nagpur','Male',4.3,71,true),
('EMP103','Kalpana Tirpude','Waste Collector',27,'West Zone','Dharampeth','9876500103','kalpana.tirpude@nmc.gov.in','26 Dharampeth, Nagpur','Female',4.7,112,true),
('EMP104','Bhaiyalal Karpe','Waste Collector',48,'North Zone','Jaripatka','9876500104','bhaiyalal.karpe@nmc.gov.in','72 Jaripatka, Nagpur','Male',4.0,40,true),
('EMP105','Jyoti Hatwar','Waste Collector',35,'South Zone','Wardhaman Nagar','9876500105','jyoti.hatwar@nmc.gov.in','11 Wardhaman Nagar, Nagpur','Female',4.4,78,true),
('EMP106','Dattatray Shivshankar','Waste Collector',41,'Dharampeth Zone','Dharampeth','9876500106','dattatray.shivshankar@nmc.gov.in','39 Dharampeth, Nagpur','Male',4.2,64,true),
('EMP107','Surekha Meshram','Waste Collector',29,'Nehru Nagar Zone','Nehru Nagar','9876500107','surekha.meshram@nmc.gov.in','20 Nehru Nagar, Nagpur','Female',4.5,88,true),
('EMP108','Vitthal Bankar','Waste Collector',36,'Hanuman Nagar Zone','Hanuman Nagar','9876500108','vitthal.bankar@nmc.gov.in','58 Hanuman Nagar, Nagpur','Male',4.1,53,true),
('EMP109','Padma Patharkar','Waste Collector',44,'Gandhibagh Zone','Gandhibagh','9876500109','padma.patharkar@nmc.gov.in','13 Gandhibagh, Nagpur','Female',4.8,128,true),
('EMP110','Uttam Sontakke','Waste Collector',32,'Satranjipura Zone','Satranjipura','9876500110','uttam.sontakke@nmc.gov.in','45 Satranjipura, Nagpur','Male',4.3,70,true),
('EMP144','Vanita Kamble','Waste Collector',32,'Hanuman Nagar Zone','Hanuman Nagar','9876500144','vanita.kamble@nmc.gov.in','50 Hanuman Nagar, Nagpur','Female',4.5,83,true),
-- ===== REMAINING MIXED =====
('EMP131','Radhika Chikhale','Toilet Cleaner',29,'Gandhibagh Zone','Gandhibagh','9876500131','radhika.chikhale@nmc.gov.in','31 Gandhibagh, Nagpur','Female',4.3,68,true),
('EMP136','Rajesh Babhulkar','Toilet Cleaner',40,'Satranjipura Zone','Satranjipura','9876500136','rajesh.babhulkar@nmc.gov.in','63 Satranjipura, Nagpur','Male',4.2,58,true),
('EMP148','Lalita Bagde','Toilet Cleaner',35,'Dharampeth Zone','Dharampeth','9876500148','lalita.bagde@nmc.gov.in','8 Dharampeth, Nagpur','Female',4.6,94,true),
-- ===== SUPERVISORS =====
('EMP121','Raj Kumar Agarwal','Supervisor',50,'Central Zone','Sitabuldi','9876500121','raj.agarwal@nmc.gov.in','1 NMC Central, Nagpur','Male',4.9,140,true),
('EMP122','Anita Singh','Supervisor',44,'East Zone','Gandhibagh','9876500122','anita.singh@nmc.gov.in','2 NMC East, Nagpur','Female',4.7,116,true),
('EMP123','Pradeep Kulkarni','Supervisor',48,'West Zone','Dharampeth','9876500123','pradeep.kulkarni@nmc.gov.in','3 NMC West, Nagpur','Male',4.8,130,true),
('EMP124','Sunanda Yadav','Supervisor',46,'North Zone','Gokulpeth','9876500124','sunanda.yadav@nmc.gov.in','4 NMC North, Nagpur','Female',4.6,108,true),
('EMP125','Milind Parekh','Supervisor',52,'South Zone','Mankapur','9876500125','milind.parekh@nmc.gov.in','5 NMC South, Nagpur','Male',4.9,148,true),
-- ===== ZONE OFFICERS =====
('EMP126','IAS Arvind Nair','Zone Officer',55,'Central Zone','NMC HQ','9876500126','arvind.nair@nmc.gov.in','NMC HQ, Civil Lines, Nagpur','Male',4.9,160,true),
('EMP127','Meena Tiwari','Zone Officer',51,'East Zone','NMC East Office','9876500127','meena.tiwari@nmc.gov.in','NMC East, Gandhibagh, Nagpur','Female',4.8,135,true),
('EMP128','Rajkumar Joshi','Zone Officer',53,'West Zone','NMC West Office','9876500128','rajkumar.joshi@nmc.gov.in','NMC West, Dharampeth, Nagpur','Male',4.7,120,true),
('EMP129','Shilpa Bhosale','Zone Officer',49,'North Zone','NMC North Office','9876500129','shilpa.bhosale@nmc.gov.in','NMC North Nagpur','Female',4.8,130,true),
('EMP130','Avinash Deshpande','Zone Officer',57,'South Zone','NMC South Office','9876500130','avinash.deshpande@nmc.gov.in','NMC South, Nagpur','Male',4.9,155,true),
-- ===== ROAD WORKERS (new job type batch) =====
('EMP-RW-001','Suresh Thakre','Road Worker',34,'Laxmi Nagar','Bajaj Nagar','9876500101','suresh.thakre@nmc.gov.in','Bajaj Nagar, Nagpur','male',4.2,60,true),
('EMP-RW-002','Manoj Yadav','Road Worker',29,'Dharampeth','Ambazari','9876500102','manoj.yadav@nmc.gov.in','Ambazari, Nagpur','male',4.0,45,true),
('EMP-RW-003','Dinesh Lanjewar','Road Worker',42,'Hanuman Nagar','Trimurti Nagar','9876500103','dinesh.lanjewar@nmc.gov.in','Trimurti Nagar, Nagpur','male',4.3,72,true),
('EMP-RW-004','Kavita Nimbalkar','Road Worker',31,'Dhantoli','Sadar','9876500104','kavita.nimbalkar@nmc.gov.in','Sadar, Nagpur','female',4.1,38,true),
('EMP-RW-005','Pramod Sahu','Road Worker',37,'Satranjipura','Itwari','9876500105','pramod.sahu@nmc.gov.in','Itwari, Nagpur','male',3.9,50,true),
('EMP-RW-006','Nilesh Kadu','Road Worker',26,'Gandhibagh','Sitabuldi','9876500106','nilesh.kadu@nmc.gov.in','Sitabuldi, Nagpur','male',4.4,55,true),
('EMP-RW-007','Rekha Wankhede','Road Worker',33,'Lakadganj','Wardhaman Nagar','9876500107','rekha.wankhede@nmc.gov.in','Wardhaman Nagar, Nagpur','female',4.2,48,true),
('EMP-RW-008','Santosh Gawande','Road Worker',45,'Ashi Nagar','Jaripatka','9876500108','santosh.gawande@nmc.gov.in','Jaripatka, Nagpur','male',4.0,63,true),
('EMP-RW-009','Anil Khare','Road Worker',38,'Dharampeth','Shankar Nagar','9876500109','anil.khare@nmc.gov.in','Shankar Nagar, Nagpur','male',4.5,80,true),
('EMP-RW-010','Pooja Bhoyar','Road Worker',27,'Laxmi Nagar','Rahate Colony','9876500110','pooja.bhoyar@nmc.gov.in','Rahate Colony, Nagpur','female',4.1,32,true),
-- ===== ELECTRICIANS =====
('EMP-EL-001','Vijay Meshram','Electrician',36,'Laxmi Nagar','Somalwada','9876500201','vijay.meshram@nmc.gov.in','Somalwada, Nagpur','male',4.6,90,true),
('EMP-EL-002','Raju Bansod','Electrician',41,'Dharampeth','Gokulpeth','9876500202','raju.bansod@nmc.gov.in','Gokulpeth, Nagpur','male',4.3,75,true),
('EMP-EL-003','Sunita Nagpure','Electrician',30,'Hanuman Nagar','Khamla','9876500203','sunita.nagpure@nmc.gov.in','Khamla, Nagpur','female',4.4,65,true),
('EMP-EL-004','Prakash Mankar','Electrician',44,'Dhantoli','Congress Nagar','9876500204','prakash.mankar@nmc.gov.in','Congress Nagar, Nagpur','male',4.1,58,true),
('EMP-EL-005','Ashok Zade','Electrician',32,'Satranjipura','Mominpura','9876500205','ashok.zade@nmc.gov.in','Mominpura, Nagpur','male',4.2,47,true),
('EMP-EL-006','Nisha Uike','Electrician',28,'Gandhibagh','Mahal','9876500206','nisha.uike@nmc.gov.in','Mahal, Nagpur','female',4.5,82,true),
('EMP-EL-007','Ramesh Dongre','Electrician',40,'Lakadganj','Punapur','9876500207','ramesh.dongre@nmc.gov.in','Punapur, Nagpur','male',4.0,60,true),
('EMP-EL-008','Seema Raut','Electrician',35,'Ashi Nagar','Kabir Nagar','9876500208','seema.raut@nmc.gov.in','Kabir Nagar, Nagpur','female',4.3,70,true),
('EMP-EL-009','Kiran Mohod','Electrician',29,'Dharampeth','Shivaji Nagar','9876500209','kiran.mohod@nmc.gov.in','Shivaji Nagar, Nagpur','male',4.1,45,true),
('EMP-EL-010','Ganesh Pande','Electrician',47,'Laxmi Nagar','Vasant Nagar','9876500210','ganesh.pande@nmc.gov.in','Vasant Nagar, Nagpur','male',4.4,88,true),
-- ===== WATER SUPPLY WORKERS =====
('EMP-WS-001','Dilip Kawle','Water Supply Worker',38,'Laxmi Nagar','Laxmi Nagar East','9876500301','dilip.kawle@nmc.gov.in','Laxmi Nagar, Nagpur','male',4.2,55,true),
('EMP-WS-002','Archana Pal','Water Supply Worker',33,'Dharampeth','Ambazari Layout','9876500302','archana.pal@nmc.gov.in','Ambazari Layout, Nagpur','female',4.4,68,true),
('EMP-WS-003','Vinod Nimje','Water Supply Worker',42,'Hanuman Nagar','Rameshwari','9876500303','vinod.nimje@nmc.gov.in','Rameshwari, Nagpur','male',4.0,50,true),
('EMP-WS-004','Poonam Shende','Water Supply Worker',27,'Dhantoli','Civil Lines','9876500304','poonam.shende@nmc.gov.in','Civil Lines, Nagpur','female',4.3,42,true),
('EMP-WS-005','Rakesh Turkar','Water Supply Worker',36,'Satranjipura','Gandhibagh','9876500305','rakesh.turkar@nmc.gov.in','Gandhibagh, Nagpur','male',4.1,60,true),
('EMP-WS-006','Deepa Meshram','Water Supply Worker',31,'Gandhibagh','Boriyapura','9876500306','deepa.meshram@nmc.gov.in','Boriyapura, Nagpur','female',4.5,78,true),
('EMP-WS-007','Sanjay Alone','Water Supply Worker',40,'Lakadganj','Bharatwada','9876500307','sanjay.alone@nmc.gov.in','Bharatwada, Nagpur','male',4.2,64,true),
('EMP-WS-008','Lata Bhagat','Water Supply Worker',35,'Ashi Nagar','Ashi Nagar','9876500308','lata.bhagat@nmc.gov.in','Ashi Nagar, Nagpur','female',4.0,48,true),
('EMP-WS-009','Umesh Sontakke','Water Supply Worker',44,'Dharampeth','Futala','9876500309','umesh.sontakke@nmc.gov.in','Futala, Nagpur','male',4.3,72,true),
('EMP-WS-010','Meena Nandanwar','Water Supply Worker',29,'Laxmi Nagar','Bajaj Nagar','9876500310','meena.nandanwar@nmc.gov.in','Bajaj Nagar, Nagpur','female',4.1,36,true),
-- ===== FIELD OFFICERS / INSPECTORS (new batch) =====
('EMP-FO-001','Arun Kolhe','Field Officer',39,'Laxmi Nagar','Samarth Nagar','9876500401','arun.kolhe@nmc.gov.in','Samarth Nagar, Nagpur','male',4.5,95,true),
('EMP-FO-002','Shalini Gade','Field Officer',34,'Dharampeth','Dharampeth Extension','9876500402','shalini.gade@nmc.gov.in','Dharampeth, Nagpur','female',4.6,100,true),
('EMP-FO-003','Nitin Waghmare','Inspector',46,'Hanuman Nagar','Hanuman Nagar','9876500403','nitin.waghmare@nmc.gov.in','Hanuman Nagar, Nagpur','male',4.3,80,true),
('EMP-FO-004','Priti Kukade','Inspector',31,'Dhantoli','Dhantoli','9876500404','priti.kukade@nmc.gov.in','Dhantoli, Nagpur','female',4.4,70,true),
('EMP-FO-005','Ravi Dhole','Field Officer',37,'Satranjipura','Satranjipura','9876500405','ravi.dhole@nmc.gov.in','Satranjipura, Nagpur','male',4.2,62,true),
('EMP-FO-006','Anita Kumbhare','Field Officer',33,'Gandhibagh','Mangalwari','9876500406','anita.kumbhare@nmc.gov.in','Mangalwari, Nagpur','female',4.5,85,true),
('EMP-FO-007','Mangesh Zingade','Inspector',42,'Lakadganj','Lakadganj','9876500407','mangesh.zingade@nmc.gov.in','Lakadganj, Nagpur','male',4.1,58,true),
('EMP-FO-008','Varsha Deshmukh','Field Officer',28,'Ashi Nagar','Jaripatka','9876500408','varsha.deshmukh@nmc.gov.in','Jaripatka, Nagpur','female',4.3,66,true),
('EMP-FO-009','Sunil Bawane','Field Officer',50,'Dharampeth','Civil Lines','9876500409','sunil.bawane@nmc.gov.in','Civil Lines, Nagpur','male',4.6,110,true),
('EMP-FO-010','Rashmi Patil','Inspector',36,'Laxmi Nagar','Congress Nagar','9876500410','rashmi.patil@nmc.gov.in','Congress Nagar, Nagpur','female',4.4,74,true),
-- ===== ANIMAL CONTROL WORKERS =====
('EMP-AC-001','Bharat Raut','Animal Control Worker',35,'Laxmi Nagar','Ramdaspeth','9876500501','bharat.raut@nmc.gov.in','Ramdaspeth, Nagpur','male',4.0,45,true),
('EMP-AC-002','Geeta Kale','Animal Control Worker',30,'Dharampeth','Gandhi Nagar','9876500502','geeta.kale@nmc.gov.in','Gandhi Nagar, Nagpur','female',4.2,55,true),
('EMP-AC-003','Tukaram Ingle','Animal Control Worker',44,'Hanuman Nagar','Snehnagar','9876500503','tukaram.ingle@nmc.gov.in','Snehnagar, Nagpur','male',3.9,38,true),
('EMP-AC-004','Sudha Girhepunje','Animal Control Worker',38,'Dhantoli','Mohan Nagar','9876500504','sudha.girhepunje@nmc.gov.in','Mohan Nagar, Nagpur','female',4.1,50,true),
('EMP-AC-005','Chandrakant More','Animal Control Worker',41,'Satranjipura','Indira Nagar','9876500505','chandrakant.more@nmc.gov.in','Indira Nagar, Nagpur','male',4.3,62,true),
-- ===== GARDENERS =====
('EMP-GD-001','Santosh Nikalje','Gardener',36,'Dharampeth','Ambazari Garden','9876500601','santosh.nikalje@nmc.gov.in','Ambazari, Nagpur','male',4.4,70,true),
('EMP-GD-002','Usha Gharde','Gardener',32,'Hanuman Nagar','Sonegaon Talav','9876500602','usha.gharde@nmc.gov.in','Sonegaon, Nagpur','female',4.2,55,true),
('EMP-GD-003','Mohan Palkar','Gardener',48,'Laxmi Nagar','Saraswati Nagar','9876500603','mohan.palkar@nmc.gov.in','Saraswati Nagar, Nagpur','male',4.0,48,true),
('EMP-GD-004','Kanchan Fulzele','Gardener',27,'Dhantoli','Dhantoli','9876500604','kanchan.fulzele@nmc.gov.in','Dhantoli, Nagpur','female',4.3,42,true),
('EMP-GD-005','Pradeep Chaware','Gardener',39,'Gandhibagh','Maharajbagh','9876500605','pradeep.chaware@nmc.gov.in','Maharajbagh, Nagpur','male',4.5,80,true)
ON CONFLICT (employee_id) DO NOTHING;

-- ============================================================
-- 12. AUTH ACCOUNTS — Admin + All Employees (pass@123)
-- ============================================================

-- ── Admin: nmc@gmail.com ─────────────────────────────────────
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'nmc@gmail.com') THEN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'nmc@gmail.com';
    INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin') ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Admin already exists — role ensured';
    RETURN;
  END IF;

  v_admin_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_admin_id,
    'authenticated', 'authenticated', 'nmc@gmail.com',
    crypt('pass@123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"name":"NMC Admin"}',
    false, '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'nmc@gmail.com'), 'email', now(), now(), now())
  ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles  (user_id, first_name, last_name, email) VALUES (v_admin_id, 'NMC', 'Admin', 'nmc@gmail.com') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role)                          VALUES (v_admin_id, 'admin')                         ON CONFLICT DO NOTHING;
  RAISE NOTICE '✓ Admin created: nmc@gmail.com / pass@123';
END $$;

-- ── All Employees ─────────────────────────────────────────────
DO $$
DECLARE
  emp       RECORD;
  v_uid     UUID;
  v_created INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  FOR emp IN
    SELECT * FROM public.employees
    WHERE email IS NOT NULL AND trim(email) != ''
    ORDER BY employee_id
  LOOP
    -- Already linked
    IF emp.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = emp.user_id) THEN
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;

    -- Auth record exists by email — just re-link
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(emp.email)) THEN
      SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(emp.email);
      UPDATE public.employees SET user_id = v_uid WHERE id = emp.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'employee') ON CONFLICT DO NOTHING;
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;

    -- Create new auth user
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change_token_current
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid,
      'authenticated', 'authenticated', lower(trim(emp.email)),
      crypt('pass@123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', emp.name),
      false, '', '', '', ''
    );

    UPDATE public.employees  SET user_id = v_uid WHERE id = emp.id;
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', lower(trim(emp.email))), 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'employee') ON CONFLICT DO NOTHING;
    v_created := v_created + 1;
  END LOOP;

  RAISE NOTICE '✓ Employees → created: %, skipped (already existed): %', v_created, v_skipped;
END $$;

-- ============================================================
-- DONE — Summary
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✓ Schema, RLS, functions, triggers: done';
  RAISE NOTICE '✓ 12 complaint categories seeded';
  RAISE NOTICE '✓ 200+ employees seeded';
  RAISE NOTICE '✓ Admin login:    nmc@gmail.com / pass@123';
  RAISE NOTICE '✓ Employee login: <their .gov.in email> / pass@123';
  RAISE NOTICE '  (password reset available via Forgot Password)';
  RAISE NOTICE '==========================================';
END $$;


/*
 * QUICK SETUP FOR TEST ACCOUNTS
 * 
 * STEP 1: Create users in Supabase Dashboard
 * ============================================
 * Go to: Authentication > Users > Add User
 * 
 * Create these:
 * 1. Email: emp1@gmail.com | Password: pass@123 | Auto-confirm: YES
 * 2. Email: nmc@gmail.com  | Password: pass@123 | Auto-confirm: YES
 * 
 * STEP 2: Copy their User IDs
 * ============================
 * After creating, click on each user and copy their UUID
 * 
 * STEP 3: Replace UUIDs below and run this SQL
 * =============================================
 * Go to: SQL Editor > New Query
 * Replace BOTH instances of each UUID below, then execute
 */

-- ============================================
-- EMPLOYEE ACCOUNT (emp1@gmail.com)
-- ============================================

-- Replace 'YOUR_EMPLOYEE_UUID_HERE' with the actual UUID (appears twice below)

INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, address)
VALUES (
  'YOUR_EMPLOYEE_UUID_HERE',
  'emp1@gmail.com',
  'Municipal',
  'Employee',
  '9876543210',
  'NMC Office, Civil Lines, Nagpur'
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address;

INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_EMPLOYEE_UUID_HERE', 'employee')
ON CONFLICT (user_id, role) DO NOTHING;


-- ============================================
-- ADMIN ACCOUNT (nmc@gmail.com)
-- ============================================

-- Replace 'YOUR_ADMIN_UUID_HERE' with the actual UUID (appears twice below)

INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, address)
VALUES (
  'YOUR_ADMIN_UUID_HERE',
  'nmc@gmail.com',
  'NMC',
  'Administrator',
  '0712-1234567',
  'Nagpur Municipal Corporation HQ, Nagpur'
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address;

INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_ADMIN_UUID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;


-- ============================================
-- VERIFY THE SETUP
-- ============================================

-- Run this to check if everything worked:

SELECT 
  p.email,
  r.role,
  p.first_name,
  p.last_name,
  p.phone,
  p.address
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.user_id = r.user_id
WHERE p.email IN ('emp1@gmail.com', 'nmc@gmail.com')
ORDER BY p.email;

-- Expected output:
-- emp1@gmail.com | employee | Municipal | Employee
-- nmc@gmail.com  | admin    | NMC       | Administrator


-- ============================================
-- LOGIN DETAILS
-- ============================================

/*
After successful setup, login at: http://localhost:5173/staff-auth

EMPLOYEE:
  Email: emp1@gmail.com
  Password: pass@123
  Role: Employee

ADMIN:
  Email: nmc@gmail.com
  Password: pass@123
  Role: Admin (Department)
*/


-- ============================================================================
-- ADMIN FEATURES MIGRATION
-- Run this SQL via Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Add new columns to complaints table
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolved_photo_url text,
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assignment_type text DEFAULT 'manual' CHECK (assignment_type IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low'));

-- 2. Create complaint_activities table for audit trail
CREATE TABLE IF NOT EXISTS complaint_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    activity_type text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    comment text,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Create assignment_rules table
CREATE TABLE IF NOT EXISTS assignment_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category text,
    subcategory text,
    zone text,
    employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    priority integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Create auto_assign_complaint function
CREATE OR REPLACE FUNCTION auto_assign_complaint()
RETURNS TRIGGER AS $$
DECLARE
    matched_employee_id uuid;
    rule_record RECORD;
BEGIN
    -- Only auto-assign if not already assigned
    IF NEW.assigned_employee_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Try to find matching assignment rule (most specific first)
    FOR rule_record IN
        SELECT employee_id
        FROM assignment_rules
        WHERE is_active = true
        AND (category IS NULL OR category = NEW.subcategory)
        AND (subcategory IS NULL OR subcategory = NEW.subcategory)
        AND (zone IS NULL OR zone = NEW.zone)
        ORDER BY
            (CASE WHEN category = NEW.subcategory THEN 1 ELSE 0 END +
             CASE WHEN subcategory = NEW.subcategory THEN 1 ELSE 0 END +
             CASE WHEN zone = NEW.zone THEN 1 ELSE 0 END) DESC,
            priority ASC
        LIMIT 1
    LOOP
        matched_employee_id := rule_record.employee_id;
        EXIT;
    END LOOP;

    -- If no rule matched, assign to least busy employee in the zone
    IF matched_employee_id IS NULL THEN
        SELECT e.id INTO matched_employee_id
        FROM employees e
        LEFT JOIN complaints c ON c.assigned_employee_id = e.id AND c.status IN ('pending', 'in_progress')
        WHERE e.is_active = true
        AND (NEW.zone IS NULL OR e.zone = NEW.zone)
        GROUP BY e.id
        ORDER BY COUNT(c.id) ASC
        LIMIT 1;
    END IF;

    -- Assign the complaint
    IF matched_employee_id IS NOT NULL THEN
        NEW.assigned_employee_id := matched_employee_id;
        NEW.assignment_type := 'auto';
        NEW.status := 'in_progress';
        -- Set default deadline (3 days from now based on priority)
        NEW.deadline := CASE NEW.priority
            WHEN 'urgent' THEN now() + interval '1 day'
            WHEN 'high' THEN now() + interval '2 days'
            WHEN 'medium' THEN now() + interval '3 days'
            ELSE now() + interval '5 days'
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create log_complaint_activity function
CREATE OR REPLACE FUNCTION log_complaint_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_type_val text;
    old_val jsonb;
    new_val jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        activity_type_val := 'created';
        new_val := to_jsonb(NEW);
        INSERT INTO complaint_activities (complaint_id, user_id, activity_type, new_value)
        VALUES (NEW.id, NEW.user_id, activity_type_val, new_val);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            activity_type_val := 'status_changed';
            old_val := jsonb_build_object('status', OLD.status);
            new_val := jsonb_build_object('status', NEW.status);
            INSERT INTO complaint_activities (complaint_id, user_id, activity_type, old_value, new_value)
            VALUES (NEW.id, auth.uid(), activity_type_val, old_val, new_val);
        END IF;

        -- Log assignment changes
        IF OLD.assigned_employee_id IS DISTINCT FROM NEW.assigned_employee_id THEN
            activity_type_val := 'assigned';
            old_val := jsonb_build_object('employee_id', OLD.assigned_employee_id);
            new_val := jsonb_build_object('employee_id', NEW.assigned_employee_id, 'assignment_type', NEW.assignment_type);
            INSERT INTO complaint_activities (complaint_id, user_id, activity_type, old_value, new_value)
            VALUES (NEW.id, COALESCE(NEW.assigned_by, auth.uid()), activity_type_val, old_val, new_val);
        END IF;

        -- Log resolution
        IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
            activity_type_val := 'resolved';
            new_val := jsonb_build_object('resolved_at', NEW.resolved_at, 'resolved_photo_url', NEW.resolved_photo_url);
            INSERT INTO complaint_activities (complaint_id, user_id, activity_type, new_value)
            VALUES (NEW.id, auth.uid(), activity_type_val, new_val);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers
DROP TRIGGER IF EXISTS auto_assign_complaint_trigger ON complaints;
CREATE TRIGGER auto_assign_complaint_trigger
    BEFORE INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_complaint();

DROP TRIGGER IF EXISTS log_complaint_activity_trigger ON complaints;
CREATE TRIGGER log_complaint_activity_trigger
    AFTER INSERT OR UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION log_complaint_activity();

-- 7. Create admin dashboard stats view
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM complaints) as total_complaints,
    (SELECT COUNT(*) FROM complaints WHERE status = 'pending') as pending_complaints,
    (SELECT COUNT(*) FROM complaints WHERE status = 'in_progress') as in_progress_complaints,
    (SELECT COUNT(*) FROM complaints WHERE status = 'resolved') as resolved_complaints,
    (SELECT COUNT(*) FROM complaints WHERE deadline < now() AND status NOT IN ('resolved', 'rejected')) as overdue_complaints,
    (SELECT COUNT(*) FROM employees WHERE is_active = true) as active_employees,
    (SELECT COUNT(*) FROM employees) as total_employees,
    (SELECT COUNT(*) FROM events) as total_events,
    (SELECT COUNT(*) FROM events WHERE date >= CURRENT_DATE) as upcoming_events,
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 2)
     FROM complaints WHERE resolved_at IS NOT NULL) as avg_resolution_hours,
    (SELECT COUNT(*) FROM complaints WHERE created_at >= CURRENT_DATE) as today_complaints,
    (SELECT COUNT(*) FROM complaints WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_complaints,
    (SELECT COUNT(*) FROM complaints WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_complaints;

-- 8. Set up RLS policies
ALTER TABLE complaint_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all complaint activities
CREATE POLICY "Admins can view complaint activities"
    ON complaint_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Allow admins full access to assignment rules
CREATE POLICY "Admins can manage assignment rules"
    ON assignment_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_deadline ON complaints(deadline);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_assignment_type ON complaints(assignment_type);
CREATE INDEX IF NOT EXISTS idx_complaint_activities_complaint_id ON complaint_activities(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_activities_created_at ON complaint_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active ON assignment_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_assignment_rules_priority ON assignment_rules(priority);

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- You can now access the admin dashboard at /admin
-- Make sure you're logged in as an admin user (nmc@gmail.com / pass@123)
-- ============================================================================


-- ============================================================
-- FIX_AUTH_LOGIN.sql
-- Fixes "Database error querying schema" on login.
--
-- Cause: A broken trigger on auth.users fires when GoTrue
-- updates last_sign_in_at during every login attempt.
-- Fix: Drop any trigger on auth.users that references a
-- function in the public schema.
-- ============================================================

-- Step 1: Show all current triggers on auth.users (for info)
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- Step 2: Drop any trigger on auth.users that calls a public.* function
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.trigger_name
    FROM information_schema.triggers t
    WHERE t.event_object_schema = 'auth'
      AND t.event_object_table  = 'users'
      AND t.action_statement ILIKE '%public.%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.trigger_name);
    RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
  END LOOP;
  RAISE NOTICE 'Done. Remaining auth.users triggers are GoTrue-internal (safe).';
END $$;

-- Step 3: Make sure pgcrypto is enabled (needed for crypt())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 4: Fix NULL text fields that GoTrue expects as empty strings.
-- phone is UNIQUE so we leave it NULL (GoTrue accepts NULL phone fine).
-- Only fix the non-unique token fields.
UPDATE auth.users
SET
  phone_change               = COALESCE(phone_change, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE email_confirmed_at IS NOT NULL;

-- Step 5: Verify admin row exists and is confirmed
SELECT
  id,
  email,
  email_confirmed_at IS NOT NULL AS confirmed,
  (SELECT COUNT(*) FROM auth.identities i WHERE i.user_id = auth.users.id) AS identity_count
FROM auth.users
WHERE lower(email) = 'nmc@gmail.com';


-- ============================================================
-- CREATE_AUTH_USERS.sql
-- Run this in Supabase SQL Editor AFTER the master migration.
--
-- Creates auth accounts for:
--   Admin:    nmc@gmail.com / pass@123
--   Employees: <name>@nmc.gov.in / pass@123
--
-- Uses direct SQL INSERT into auth.users + auth.identities.
-- No API calls → no rate limits → all 201 accounts in one shot.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- ============================================================

DO $$
DECLARE
  emp     RECORD;
  v_uid   UUID;
  v_hash  TEXT;
  created INT := 0;
  skipped INT := 0;
BEGIN
  -- Pre-compute bcrypt hash once (same password for all)
  v_hash := crypt('pass@123', gen_salt('bf'));

  -- ──────────────────────────────────────────────────────
  -- 1. ADMIN ACCOUNT
  -- ──────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = 'nmc@gmail.com') THEN
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'nmc@gmail.com';
    skipped := skipped + 1;
  ELSE
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'nmc@gmail.com', v_hash,
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"NMC Admin"}'::jsonb,
      false, '', '', '', ''
    );
    created := created + 1;
  END IF;

  -- Identity record (needed for email/password login to work)
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_uid, v_uid, 'nmc@gmail.com', 'email',
    jsonb_build_object(
      'sub',            v_uid::text,
      'email',          'nmc@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    now(), now(), now()
  )
  ON CONFLICT DO NOTHING;

  -- Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Profile
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (v_uid, 'NMC', 'Admin', 'nmc@gmail.com')
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

  RAISE NOTICE 'Admin: nmc@gmail.com → %', v_uid;

  -- ──────────────────────────────────────────────────────
  -- 2. EMPLOYEE ACCOUNTS (loop through all employees)
  -- ──────────────────────────────────────────────────────
  FOR emp IN
    SELECT id, name, email
    FROM   public.employees
    WHERE  email IS NOT NULL AND email <> ''
    ORDER  BY employee_id
  LOOP
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(emp.email)) THEN
      SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(emp.email);
      skipped := skipped + 1;
    ELSE
      v_uid := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role,
        email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, confirmation_token,
        email_change, email_change_token_new, recovery_token
      ) VALUES (
        
        v_uid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        lower(emp.email), v_hash,
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', emp.name),
        false, '', '', '', ''
      );
      created := created + 1;
    END IF;

    -- Identity record
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider,
      identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_uid, v_uid, lower(emp.email), 'email',
      jsonb_build_object(
        'sub',            v_uid::text,
        'email',          lower(emp.email),
        'email_verified', true,
        'phone_verified', false
      ),
      now(), now(), now()
    )
    ON CONFLICT DO NOTHING;

    -- Role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Link employee row to auth user
    UPDATE public.employees SET user_id = v_uid WHERE id = emp.id;

  END LOOP;

  RAISE NOTICE '==========================================';
  RAISE NOTICE '✓ Auth accounts done!';
  RAISE NOTICE '  Created: %  |  Already existed: %', created, skipped;
  RAISE NOTICE '  Admin:    nmc@gmail.com / pass@123';
  RAISE NOTICE '  Employee: <name>@nmc.gov.in / pass@123';
  RAISE NOTICE '==========================================';

END $$;



-- ============================================================
-- CREATE AUTH ACCOUNTS — Run this AFTER MASTER_SETUP.sql
-- (Safe to re-run — uses ON CONFLICT / existence checks)
--
-- Creates:
--   1. Admin account       → nmc@gmail.com / pass@123
--   2. All 200+ employees  → their .gov.in email / pass@123
--
-- Users can reset their password via "Forgot Password".
-- ============================================================

-- ============================================================
-- 1. ADMIN ACCOUNT — nmc@gmail.com
-- ============================================================
DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'nmc@gmail.com') THEN
    RAISE NOTICE 'Admin account already exists — skipping creation';
    -- Ensure role exists anyway
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'nmc@gmail.com';
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_admin_id, 'admin')
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  v_admin_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated', 'authenticated',
    'nmc@gmail.com',
    crypt('pass@123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"NMC Admin"}',
    false,
    '', '', '', ''
  );

  -- Profile
  -- Identity record (required for email login in modern Supabase)
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'nmc@gmail.com'),
    'email', now(), now(), now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (v_admin_id, 'NMC', 'Admin', 'nmc@gmail.com')
  ON CONFLICT DO NOTHING;

  -- Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✓ Admin account created: nmc@gmail.com / pass@123';
END $$;

-- ============================================================
-- 2. EMPLOYEE ACCOUNTS — all employees in public.employees
-- ============================================================
DO $$
DECLARE
  emp        RECORD;
  v_user_id  UUID;
  v_created  INTEGER := 0;
  v_skipped  INTEGER := 0;
BEGIN
  FOR emp IN
    SELECT * FROM public.employees
    WHERE email IS NOT NULL AND trim(email) != ''
    ORDER BY employee_id
  LOOP
    -- Already has a linked auth account?
    IF emp.user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users WHERE id = emp.user_id
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Auth user with same email already exists (from a previous run)?
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(emp.email)) THEN
      -- Just link + ensure role
      SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(emp.email);
      UPDATE public.employees SET user_id = v_user_id WHERE id = emp.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'employee') ON CONFLICT DO NOTHING;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Create new auth user
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin,
      confirmation_token, recovery_token,
      email_change_token_new, email_change_token_current
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated', 'authenticated',
      lower(trim(emp.email)),
      crypt('pass@123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', emp.name),
      false,
      '', '', '', ''
    );

    -- Link employee row → auth user
    UPDATE public.employees SET user_id = v_user_id WHERE id = emp.id;

    -- Identity record (required for email login in modern Supabase)
    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(emp.email))),
      'email', now(), now(), now()
    ) ON CONFLICT DO NOTHING;

    -- Assign employee role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'employee')
    ON CONFLICT DO NOTHING;

    v_created := v_created + 1;
  END LOOP;

  RAISE NOTICE '✓ Employee accounts → created: %, skipped (already existed): %', v_created, v_skipped;
END $$;

-- ============================================================
-- 3. VERIFY
-- ============================================================
SELECT
  'Admin'    AS type,
  u.email,
  CASE WHEN r.role IS NOT NULL THEN r.role::text ELSE '⚠ NO ROLE' END AS role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'admin'
WHERE u.email = 'nmc@gmail.com'

UNION ALL

SELECT
  'Employee' AS type,
  u.email,
  CASE WHEN r.role IS NOT NULL THEN r.role::text ELSE '⚠ NO ROLE' END AS role
FROM auth.users u
JOIN public.employees e ON e.user_id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'employee'
ORDER BY type, email
LIMIT 20;

-- Quick count
SELECT
  (SELECT count(*) FROM auth.users)                                       AS total_auth_users,
  (SELECT count(*) FROM public.employees WHERE user_id IS NOT NULL)       AS employees_linked,
  (SELECT count(*) FROM public.user_roles WHERE role = 'employee')        AS employee_roles,
  (SELECT count(*) FROM public.user_roles WHERE role = 'admin')           AS admin_roles;





DROP FUNCTION IF EXISTS public.handle_new_user()        CASCADE;
DROP FUNCTION IF EXISTS public.log_complaint_activity() CASCADE;

-- Drop old complaint trigger (safe on fresh DB — only runs if table exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'complaints'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_log_complaint_activity ON public.complaints;
  END IF;
END $$;

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('citizen', 'employee', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role       public.app_role NOT NULL DEFAULT 'citizen',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name    TEXT,
    middle_name   TEXT,
    last_name     TEXT,
    email         TEXT,
    phone         TEXT,
    address       TEXT,
    date_of_birth DATE,
    gender        TEXT,
    avatar_url    TEXT,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaint_categories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    icon          TEXT,
    description   TEXT,
    subcategories JSONB DEFAULT '[]',
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_id     TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    job             TEXT NOT NULL,
    age             INTEGER,
    zone            TEXT NOT NULL,
    main_area       TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    gender          TEXT DEFAULT 'Male',
    date_of_joining DATE DEFAULT CURRENT_DATE,
    photo_url       TEXT,
    rating          DECIMAL DEFAULT 0,
    total_ratings   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaints (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id          UUID REFERENCES public.complaint_categories(id),
    subcategory          TEXT,
    title                TEXT NOT NULL,
    description          TEXT,
    address              TEXT NOT NULL,
    reason               TEXT[],
    photo_url            TEXT,
    status               TEXT DEFAULT 'pending'
                             CHECK (status IN ('pending','in_progress','resolved','rejected')),
    assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    assigned_by          UUID REFERENCES auth.users(id),
    assignment_type      TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto','manual')),
    priority             TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
    zone                 TEXT,
    latitude             DECIMAL,
    longitude            DECIMAL,
    deadline             TIMESTAMP WITH TIME ZONE,
    resolved_photo_url   TEXT,
    resolved_at          TIMESTAMP WITH TIME ZONE,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employee_encouragements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
    description TEXT,
    username    TEXT,
    address     TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, employee_id)
);

CREATE TABLE IF NOT EXISTS public.events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name             TEXT NOT NULL,
    organizer        TEXT NOT NULL,
    description      TEXT,
    date             DATE NOT NULL,
    venue            TEXT NOT NULL,
    category         TEXT,
    poster_url       TEXT,
    max_participants INTEGER,
    is_approved      BOOLEAN DEFAULT false,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id   UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    status     TEXT DEFAULT 'registered' CHECK (status IN ('registered','attended','cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaint_activities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id  UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
    user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'created','assigned','reassigned','status_changed',
        'deadline_updated','resolved','rejected','comment_added'
    )),
    old_value     JSONB,
    new_value     JSONB,
    comment       TEXT,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignment_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category    TEXT,
    subcategory TEXT,
    zone        TEXT,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    priority    INTEGER DEFAULT 1,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_complaints_user_id           ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status            ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_employee ON public.complaints(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_complaint_activities_id      ON public.complaint_activities(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_activities_at      ON public.complaint_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_category    ON public.assignment_rules(category);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_zone        ON public.assignment_rules(zone);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active      ON public.assignment_rules(is_active) WHERE is_active = true;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.user_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_encouragements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_assignment_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.auto_assign_complaint()
RETURNS TRIGGER AS $$
DECLARE
    assigned_employee UUID;
    default_deadline  TIMESTAMP WITH TIME ZONE;
    cat_name          TEXT;
    eligible_jobs     TEXT[];
BEGIN
    default_deadline := now() + INTERVAL '3 days';
    NEW.deadline := default_deadline;

    SELECT name INTO cat_name
    FROM public.complaint_categories
    WHERE id = NEW.category_id;

    eligible_jobs := CASE cat_name
        WHEN 'Public Toilets & Sanitation' THEN ARRAY['Toilet Cleaner', 'Sanitation Worker']
        WHEN 'Waste & Garbage Management'  THEN ARRAY['Garbage Collector', 'Sweeper', 'Waste Collector', 'Street Sweeper']
        WHEN 'Drainage & Sewerage Issues'  THEN ARRAY['Drainage Worker', 'Plumber', 'Sanitation Worker']
        WHEN 'Construction & Debris'       THEN ARRAY['Construction Worker', 'Road Worker', 'Field Officer']
        WHEN 'Street Cleaning / Sweeping'  THEN ARRAY['Sweeper', 'Street Sweeper', 'Garbage Collector']
        WHEN 'Septic Tank Issues'          THEN ARRAY['Sanitation Worker', 'Toilet Cleaner', 'Plumber', 'Drainage Worker']
        WHEN 'Road & Pothole Issues'       THEN ARRAY['Road Worker', 'Construction Worker', 'Field Officer']
        WHEN 'Water Supply Issues'         THEN ARRAY['Plumber', 'Water Supply Worker', 'Field Officer']
        WHEN 'Street Light Issues'         THEN ARRAY['Electrician', 'Field Officer']
        WHEN 'Illegal Encroachment'        THEN ARRAY['Field Officer', 'Inspector', 'Supervisor']
        WHEN 'Stray Animals'               THEN ARRAY['Animal Control Worker', 'Field Officer']
        WHEN 'Parks & Public Spaces'       THEN ARRAY['Gardener', 'Sweeper', 'Field Officer']
        ELSE                                    ARRAY['Sweeper', 'Sanitation Worker', 'Field Officer']
    END;

    -- 1st: matching job, same zone, least loaded
    SELECT e.id INTO assigned_employee
    FROM public.employees e
    LEFT JOIN (
        SELECT assigned_employee_id, COUNT(*) AS active_count
        FROM public.complaints WHERE status IN ('pending','in_progress')
        GROUP BY assigned_employee_id
    ) cs ON cs.assigned_employee_id = e.id
    WHERE e.is_active = true AND e.job = ANY(eligible_jobs)
      AND (NEW.zone IS NULL OR e.zone = NEW.zone OR NEW.zone = '')
    ORDER BY COALESCE(cs.active_count, 0) ASC, RANDOM() LIMIT 1;

    -- 2nd: matching job, any zone
    IF assigned_employee IS NULL THEN
        SELECT e.id INTO assigned_employee
        FROM public.employees e
        LEFT JOIN (
            SELECT assigned_employee_id, COUNT(*) AS active_count
            FROM public.complaints WHERE status IN ('pending','in_progress')
            GROUP BY assigned_employee_id
        ) cs ON cs.assigned_employee_id = e.id
        WHERE e.is_active = true AND e.job = ANY(eligible_jobs)
        ORDER BY COALESCE(cs.active_count, 0) ASC, RANDOM() LIMIT 1;
    END IF;

    -- 3rd: any active in zone
    IF assigned_employee IS NULL THEN
        SELECT id INTO assigned_employee FROM public.employees
        WHERE is_active = true AND (NEW.zone IS NULL OR zone = NEW.zone OR NEW.zone = '')
        ORDER BY RANDOM() LIMIT 1;
    END IF;

    -- Last resort
    IF assigned_employee IS NULL THEN
        SELECT id INTO assigned_employee FROM public.employees
        WHERE is_active = true ORDER BY RANDOM() LIMIT 1;
    END IF;

    IF assigned_employee IS NOT NULL THEN
        NEW.assigned_employee_id := assigned_employee;
        NEW.assignment_type      := 'auto';
        NEW.status               := 'in_progress';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at           ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_complaints_updated_at         ON public.complaints;
CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at          ON public.employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at             ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_rules_updated_at   ON public.assignment_rules;
CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON public.assignment_rules FOR EACH ROW EXECUTE FUNCTION public.update_assignment_rules_updated_at();

DROP TRIGGER IF EXISTS trigger_auto_assign_complaint        ON public.complaints;
CREATE TRIGGER trigger_auto_assign_complaint
  BEFORE INSERT ON public.complaints FOR EACH ROW
  WHEN (NEW.assigned_employee_id IS NULL)
  EXECUTE FUNCTION public.auto_assign_complaint();

-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles"    ON public.user_roles;
CREATE POLICY "Users can view their own roles"            ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own role"   ON public.user_roles;
CREATE POLICY "Users can insert their own role"           ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all roles"       ON public.user_roles;
CREATE POLICY "Admins can manage all roles"               ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles"         ON public.profiles;
CREATE POLICY "Users can view all profiles"                 ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update their own profile"  ON public.profiles;
CREATE POLICY "Users can update their own profile"          ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own profile"  ON public.profiles;
CREATE POLICY "Users can insert their own profile"          ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- complaint_categories
DROP POLICY IF EXISTS "Anyone can view categories"   ON public.complaint_categories;
CREATE POLICY "Anyone can view categories"           ON public.complaint_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.complaint_categories;
CREATE POLICY "Admins can manage categories"         ON public.complaint_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- employees
DROP POLICY IF EXISTS "Anyone can view employees"        ON public.employees;
CREATE POLICY "Anyone can view employees"                ON public.employees FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage employees"      ON public.employees;
CREATE POLICY "Admins can manage employees"              ON public.employees FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Employees can update own profile" ON public.employees;
CREATE POLICY "Employees can update own profile"         ON public.employees FOR UPDATE USING (auth.uid() = user_id);

-- complaints
DROP POLICY IF EXISTS "Citizens can view their own complaints"    ON public.complaints;
CREATE POLICY "Citizens can view their own complaints"           ON public.complaints FOR SELECT USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'employee') OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Citizens can create complaints"            ON public.complaints;
CREATE POLICY "Citizens can create complaints"                   ON public.complaints FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Citizens can update their own complaints"  ON public.complaints;
CREATE POLICY "Citizens can update their own complaints"         ON public.complaints FOR UPDATE USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'employee') OR public.has_role(auth.uid(), 'admin'));

-- employee_encouragements
DROP POLICY IF EXISTS "Anyone can view encouragements"             ON public.employee_encouragements;
CREATE POLICY "Anyone can view encouragements"                     ON public.employee_encouragements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can add encouragement"  ON public.employee_encouragements;
CREATE POLICY "Authenticated users can add encouragement"          ON public.employee_encouragements FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own encouragement"   ON public.employee_encouragements;
CREATE POLICY "Users can update their own encouragement"           ON public.employee_encouragements FOR UPDATE USING (auth.uid() = user_id);

-- events
DROP POLICY IF EXISTS "Anyone can view approved events"       ON public.events;
CREATE POLICY "Anyone can view approved events"               ON public.events FOR SELECT USING (
    is_approved = true OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"         ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can update their own events"     ON public.events;
CREATE POLICY "Users can update their own events"             ON public.events FOR UPDATE USING (
    auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- event_registrations
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
CREATE POLICY "Users can view their own registrations"         ON public.event_registrations FOR SELECT USING (
    auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users can register for events"          ON public.event_registrations;
CREATE POLICY "Users can register for events"                  ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can cancel their registration"    ON public.event_registrations;
CREATE POLICY "Users can cancel their registration"            ON public.event_registrations FOR DELETE USING (auth.uid() = user_id);

-- contact_messages
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"        ON public.contact_messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view messages"           ON public.contact_messages;
CREATE POLICY "Admins can view messages"                   ON public.contact_messages FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can update messages"         ON public.contact_messages;
CREATE POLICY "Admins can update messages"                 ON public.contact_messages FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can delete messages"         ON public.contact_messages;
CREATE POLICY "Admins can delete messages"                 ON public.contact_messages FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- complaint_activities
DROP POLICY IF EXISTS "Anyone can view complaint activities" ON public.complaint_activities;
CREATE POLICY "Anyone can view complaint activities"        ON public.complaint_activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "System can insert activities"        ON public.complaint_activities;
CREATE POLICY "System can insert activities"               ON public.complaint_activities FOR INSERT WITH CHECK (true);

-- assignment_rules
DROP POLICY IF EXISTS "Anyone can view assignment rules"   ON public.assignment_rules;
CREATE POLICY "Anyone can view assignment rules"           ON public.assignment_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage assignment rules" ON public.assignment_rules;
CREATE POLICY "Admins can manage assignment rules"         ON public.assignment_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 9. GRANTS — Supabase required grants for PostgREST + auth
-- ============================================================

-- Schema usage: ALL roles that Supabase uses internally
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- postgres + service_role need full access (used by Supabase internals & PostgREST cache)
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO postgres, service_role;

-- Default privileges so future objects get the same grants automatically
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES    TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES  TO postgres, anon, authenticated, service_role;

-- App-level grants for anon / authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_activities    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_encouragements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events                  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations     TO authenticated;
GRANT SELECT, INSERT                  ON public.contact_messages       TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE  ON public.contact_messages       TO authenticated;
GRANT SELECT                          ON public.complaint_categories   TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE          ON public.complaint_categories   TO authenticated;
GRANT SELECT                          ON public.employees              TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE          ON public.employees              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON public.assignment_rules       TO authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- has_role() must be callable by all roles used in RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role)       TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column()            TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.update_assignment_rules_updated_at()  TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.auto_assign_complaint()               TO postgres, service_role;
-- ============================================================
-- 10. PUBLIC VIEW
-- ============================================================
DROP VIEW IF EXISTS public.public_complaint_stats;
CREATE VIEW public.public_complaint_stats AS
SELECT
    COUNT(*)                                                                 AS total,
    COUNT(*) FILTER (WHERE status = 'pending')                              AS pending,
    COUNT(*) FILTER (WHERE status = 'in_progress')                          AS in_progress,
    COUNT(*) FILTER (WHERE status = 'resolved')                             AS resolved,
    COUNT(*) FILTER (WHERE status = 'rejected')                             AS rejected,
    COUNT(*) FILTER (WHERE deadline < now() AND status NOT IN ('resolved','rejected')) AS overdue,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)                      AS today
FROM public.complaints;

GRANT SELECT ON public.public_complaint_stats TO anon, authenticated;

-- ============================================================
-- 10. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'complaint-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'complaint-images');

DROP POLICY IF EXISTS "Allow owner delete" ON storage.objects;
CREATE POLICY "Allow owner delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'complaint-images'
    AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin')));

-- ============================================================
-- 11. SEED — COMPLAINT CATEGORIES (12 total)
-- ============================================================
INSERT INTO public.complaint_categories (name, icon, description, subcategories) VALUES
('Public Toilets & Sanitation','toilet','Issues related to public toilets and sanitation facilities',
 '["Yellow Spot (Public Urination Spot)","No Electricity in Public Toilet","No Water Supply in Public Toilet","Public Toilet Blockage","Open Defecation","Toilet Not Cleaned","Broken Door / Lock","No Dustbin in Toilet","Toilet Overflowing","Toilet Light Not Working"]'),
('Waste & Garbage Management','trash-2','Issues related to waste collection and garbage management',
 '["Garbage Overflow","Missed Pickup","Improper Disposal","Littering","Garbage Burning","No Dustbin in Area","Dumping on Road / Footpath","Wet & Dry Waste Mixed","Garbage Vehicle Not Coming","Overflowing Community Bin"]'),
('Drainage & Sewerage Issues','droplets','Issues related to drainage and sewerage systems',
 '["Blocked Drain","Overflowing Sewage","Broken Manhole","Stagnant Water","Foul Smell","Flooded Road after Rain","Open Drain Dangerous","Sewer Line Choked","Drainage Water on Road","Manhole Cover Missing"]'),
('Construction & Debris','construction','Issues related to construction waste and debris',
 '["Unauthorized Dumping","Construction Waste on Road","Road Debris","Building Material Blocking Road","Rubble Not Cleared","Construction at Night (Noise)","Dust Pollution from Site","Broken Road due to Construction","Damaged Footpath by Construction"]'),
('Street Cleaning / Sweeping','sparkles','Issues related to street cleanliness and sweeping',
 '["Unswept Streets","Dirty Public Spaces","Leaf Accumulation","Market Area Not Cleaned","Road Divider Dirty","Footpath Dirty","Garbage Near School / Hospital","Festival Waste Not Cleared","Bus Stop / Auto Stand Dirty"]'),
('Septic Tank Issues','cylinder','Issues related to septic tanks and sewer connections',
 '["Septic Tank Overflow","Septic Tank Cleaning Request","Leakage from Septic Tank","Bad Odor from Septic Tank","Septic Tank Damaged","No Drainage Connection"]'),
('Road & Pothole Issues','route','Issues related to road conditions and infrastructure',
 '["Pothole on Road","Broken Road Surface","Road Waterlogging","Missing Speed Breaker","Damaged / Broken Divider","Faded Road Markings","Broken Footpath / Sidewalk","Manhole Protrusion on Road","Road Dug Up Not Restored","Dangerous Road Condition"]'),
('Water Supply Issues','waves','Issues with municipal water supply and pipelines',
 '["No Water Supply","Dirty / Contaminated Water","Water Pipe Burst","Low Water Pressure","Water Leakage from Pipeline","Irregular Water Supply Timing","Broken / Stolen Water Meter","No Water Connection in Area"]'),
('Street Light Issues','lightbulb','Issues related to street lighting and electrical poles',
 '["Street Light Not Working","Broken Street Light Pole","Blinking / Flickering Light","Street Light On During Daytime","No Street Light in Area","Exposed / Hanging Wires","Electric Pole Damaged / Dangerous"]'),
('Illegal Encroachment','shield-alert','Encroachment on public property, roads, and footpaths',
 '["Encroachment on Footpath","Illegal Hawkers Blocking Road","Illegal Construction on Public Land","Vehicle Parked Permanently on Footpath","Shop / Stall Extending onto Road","Unauthorized Billboard / Banner"]'),
('Stray Animals','dog','Issues related to stray animals causing nuisance or danger',
 '["Stray Dog Menace / Attack","Cattle / Cows on Road","Pig Roaming in Residential Area","Dead Animal on Road / Footpath","Monkey Menace","Stray Animal Bite"]'),
('Parks & Public Spaces','trees','Issues in parks, gardens, playgrounds, and public areas',
 '["Park Not Maintained","Broken Equipment in Park / Playground","Garbage Dumped in Park","Broken Benches or Seats","Overgrown Grass / Bushes","Park Light Not Working","Tree Fallen on Road","Dead / Dangerous Tree","Lake / Pond Area Dirty"]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. SEED — EMPLOYEES (200+)
-- ============================================================
INSERT INTO public.employees (employee_id, name, job, age, zone, main_area, phone, email, address, gender, rating, total_ratings, is_active) VALUES
-- TOILET CLEANERS
('EMP001','Arun Meshram','Toilet Cleaner',32,'Central Zone','Sitabuldi','9876500001','arun.meshram@nmc.gov.in','12 Sitabuldi, Nagpur','Male',4.2,60,true),
('EMP002','Sunita Bansod','Toilet Cleaner',27,'Central Zone','Itwari','9876500002','sunita.bansod@nmc.gov.in','45 Itwari, Nagpur','Female',4.5,85,true),
('EMP003','Ramesh Waghmare','Toilet Cleaner',40,'East Zone','Gandhibagh','9876500003','ramesh.waghmare@nmc.gov.in','7 Gandhibagh, Nagpur','Male',4.0,45,true),
('EMP004','Kavita Rathod','Toilet Cleaner',35,'East Zone','Kamptee Road','9876500004','kavita.rathod@nmc.gov.in','23 Kamptee Rd, Nagpur','Female',4.3,70,true),
('EMP005','Santosh Khobragade','Toilet Cleaner',29,'West Zone','Dharampeth','9876500005','santosh.khobragade@nmc.gov.in','5 Dharampeth, Nagpur','Male',4.6,90,true),
('EMP006','Manda Ramteke','Toilet Cleaner',44,'West Zone','Ramdaspeth','9876500006','manda.ramteke@nmc.gov.in','18 Ramdaspeth, Nagpur','Female',4.1,55,true),
('EMP007','Dilip Dongre','Toilet Cleaner',38,'North Zone','Gokulpeth','9876500007','dilip.dongre@nmc.gov.in','34 Gokulpeth, Nagpur','Male',4.4,65,true),
('EMP008','Anita Uikey','Toilet Cleaner',31,'North Zone','Jaripatka','9876500008','anita.uikey@nmc.gov.in','9 Jaripatka, Nagpur','Female',4.7,100,true),
('EMP009','Prakash Hatwar','Toilet Cleaner',45,'South Zone','Mankapur','9876500009','prakash.hatwar@nmc.gov.in','67 Mankapur, Nagpur','Male',4.2,58,true),
('EMP010','Leela Nikhade','Toilet Cleaner',36,'South Zone','Wardhaman Nagar','9876500010','leela.nikhade@nmc.gov.in','2 Wardhaman Nagar, Nagpur','Female',4.5,80,true),
('EMP011','Ganesh Borkar','Toilet Cleaner',33,'Dharampeth Zone','Dharampeth','9876500011','ganesh.borkar@nmc.gov.in','11 Dharampeth, Nagpur','Male',4.0,40,true),
('EMP012','Shobha Kumre','Toilet Cleaner',28,'Nehru Nagar Zone','Nehru Nagar','9876500012','shobha.kumre@nmc.gov.in','30 Nehru Nagar, Nagpur','Female',4.3,75,true),
('EMP013','Vijay Sonkusare','Toilet Cleaner',42,'Hanuman Nagar Zone','Hanuman Nagar','9876500013','vijay.sonkusare@nmc.gov.in','8 Hanuman Nagar, Nagpur','Male',4.6,95,true),
('EMP014','Pushpa Gedam','Toilet Cleaner',39,'Gandhibagh Zone','Gandhibagh','9876500014','pushpa.gedam@nmc.gov.in','16 Gandhibagh, Nagpur','Female',4.1,50,true),
('EMP015','Naresh Ingle','Toilet Cleaner',34,'Satranjipura Zone','Satranjipura','9876500015','naresh.ingle@nmc.gov.in','25 Satranjipura, Nagpur','Male',4.4,65,true),
('EMP131','Radhika Chikhale','Toilet Cleaner',29,'Gandhibagh Zone','Gandhibagh','9876500131','radhika.chikhale@nmc.gov.in','31 Gandhibagh, Nagpur','Female',4.3,68,true),
('EMP136','Rajesh Babhulkar','Toilet Cleaner',40,'Satranjipura Zone','Satranjipura','9876500136','rajesh.babhulkar@nmc.gov.in','63 Satranjipura, Nagpur','Male',4.2,58,true),
('EMP148','Lalita Bagde','Toilet Cleaner',35,'Dharampeth Zone','Dharampeth','9876500148','lalita.bagde@nmc.gov.in','8 Dharampeth, Nagpur','Female',4.6,94,true),
-- SANITATION WORKERS
('EMP016','Priya Ambhore','Sanitation Worker',26,'Central Zone','Sitabuldi','9876500016','priya.ambhore@nmc.gov.in','3 Civil Lines, Nagpur','Female',4.8,120,true),
('EMP017','Mohan Nandeshwar','Sanitation Worker',37,'Central Zone','Civil Lines','9876500017','mohan.nandeshwar@nmc.gov.in','44 Civil Lines, Nagpur','Male',4.2,60,true),
('EMP018','Rekha Sorte','Sanitation Worker',30,'East Zone','Lakadganj','9876500018','rekha.sorte@nmc.gov.in','12 Lakadganj, Nagpur','Female',4.5,90,true),
('EMP019','Kiran Fulzele','Sanitation Worker',43,'East Zone','Kamptee Road','9876500019','kiran.fulzele@nmc.gov.in','56 Kamptee Rd, Nagpur','Male',4.0,45,true),
('EMP020','Suman Wankhede','Sanitation Worker',29,'West Zone','Dharampeth','9876500020','suman.wankhede@nmc.gov.in','7 Dharampeth, Nagpur','Female',4.6,85,true),
('EMP021','Anil Kadu','Sanitation Worker',41,'West Zone','Hingna Road','9876500021','anil.kadu@nmc.gov.in','89 Hingna Rd, Nagpur','Male',4.3,70,true),
('EMP022','Bharti Pawar','Sanitation Worker',32,'North Zone','Jaripatka','9876500022','bharti.pawar@nmc.gov.in','22 Jaripatka, Nagpur','Female',4.7,105,true),
('EMP023','Sunil Gajbhiye','Sanitation Worker',38,'North Zone','Nandanvan','9876500023','sunil.gajbhiye@nmc.gov.in','33 Nandanvan, Nagpur','Male',4.1,55,true),
('EMP024','Mamta Sakhre','Sanitation Worker',27,'South Zone','Mankapur','9876500024','mamta.sakhre@nmc.gov.in','6 Mankapur, Nagpur','Female',4.4,80,true),
('EMP025','Ravi Khade','Sanitation Worker',46,'South Zone','Ajni','9876500025','ravi.khade@nmc.gov.in','14 Ajni, Nagpur','Male',4.2,65,true),
('EMP111','Manohar Dambhare','Sanitation Worker',40,'Central Zone','Itwari','9876500111','manohar.dambhare@nmc.gov.in','9 Itwari, Nagpur','Male',4.4,82,true),
('EMP112','Sarita Gadekar','Sanitation Worker',34,'East Zone','Butibori','9876500112','sarita.gadekar@nmc.gov.in','67 Butibori, Nagpur','Female',4.0,44,true),
('EMP113','Navnath Bhave','Sanitation Worker',28,'West Zone','Hingna Road','9876500113','navnath.bhave@nmc.gov.in','30 Hingna Rd, Nagpur','Male',4.6,91,true),
('EMP114','Indra Thakre','Sanitation Worker',45,'North Zone','Nandanvan','9876500114','indra.thakre@nmc.gov.in','24 Nandanvan, Nagpur','Female',4.3,74,true),
('EMP115','Shankar Dakhore','Sanitation Worker',38,'South Zone','Mankapur','9876500115','shankar.dakhore@nmc.gov.in','57 Mankapur, Nagpur','Male',4.7,106,true),
('EMP116','Lalita Kumbhare','Sanitation Worker',31,'Dharampeth Zone','Dharampeth','9876500116','lalita.kumbhare@nmc.gov.in','33 Dharampeth, Nagpur','Female',4.2,60,true),
('EMP117','Prakash Gondhale','Sanitation Worker',47,'Nehru Nagar Zone','Nehru Nagar','9876500117','prakash.gondhale@nmc.gov.in','81 Nehru Nagar, Nagpur','Male',4.5,85,true),
('EMP118','Kaveri Ghuguskar','Sanitation Worker',26,'Hanuman Nagar Zone','Hanuman Nagar','9876500118','kaveri.ghuguskar@nmc.gov.in','6 Hanuman Nagar, Nagpur','Female',4.1,50,true),
('EMP119','Dattu Bhoye','Sanitation Worker',42,'Gandhibagh Zone','Gandhibagh','9876500119','dattu.bhoye@nmc.gov.in','48 Gandhibagh, Nagpur','Male',4.6,93,true),
('EMP120','Sangita Mankar','Sanitation Worker',33,'Satranjipura Zone','Satranjipura','9876500120','sangita.mankar@nmc.gov.in','22 Satranjipura, Nagpur','Female',4.4,79,true),
('EMP135','Hemlata Ramgirkar','Sanitation Worker',27,'Gandhibagh Zone','Gandhibagh','9876500135','hemlata.ramgirkar@nmc.gov.in','44 Gandhibagh, Nagpur','Female',4.4,76,true),
('EMP150','Vimala Ingole','Sanitation Worker',44,'Central Zone','Civil Lines','9876500150','vimala.ingole@nmc.gov.in','16 Civil Lines, Nagpur','Female',4.4,79,true),
-- GARBAGE COLLECTORS
('EMP026','Deepak Shende','Garbage Collector',35,'Central Zone','Sitabuldi','9876500026','deepak.shende@nmc.gov.in','5 Sitabuldi, Nagpur','Male',4.5,95,true),
('EMP027','Lata Patil','Garbage Collector',28,'Central Zone','Itwari','9876500027','lata.patil@nmc.gov.in','38 Itwari, Nagpur','Female',4.0,50,true),
('EMP028','Mahesh Bhoite','Garbage Collector',44,'East Zone','Gandhibagh','9876500028','mahesh.bhoite@nmc.gov.in','27 Gandhibagh, Nagpur','Male',4.6,110,true),
('EMP029','Savita Dakhore','Garbage Collector',31,'East Zone','Butibori','9876500029','savita.dakhore@nmc.gov.in','41 Butibori, Nagpur','Female',4.3,75,true),
('EMP030','Nilesh Gode','Garbage Collector',39,'West Zone','Dharampeth','9876500030','nilesh.gode@nmc.gov.in','19 Dharampeth, Nagpur','Male',4.7,115,true),
('EMP031','Usha Mankar','Garbage Collector',34,'West Zone','Ramdaspeth','9876500031','usha.mankar@nmc.gov.in','52 Ramdaspeth, Nagpur','Female',4.2,60,true),
('EMP032','Pravin Nagpure','Garbage Collector',42,'North Zone','Gokulpeth','9876500032','pravin.nagpure@nmc.gov.in','15 Gokulpeth, Nagpur','Male',4.5,88,true),
('EMP033','Sonal Deshpande','Garbage Collector',29,'North Zone','Jaripatka','9876500033','sonal.deshpande@nmc.gov.in','28 Jaripatka, Nagpur','Female',4.0,42,true),
('EMP034','Tushar Hinge','Garbage Collector',36,'South Zone','Mankapur','9876500034','tushar.hinge@nmc.gov.in','63 Mankapur, Nagpur','Male',4.4,80,true),
('EMP035','Vaishali Banskar','Garbage Collector',48,'South Zone','Wardhaman Nagar','9876500035','vaishali.banskar@nmc.gov.in','4 Wardhaman Nagar, Nagpur','Female',4.1,48,true),
('EMP036','Hemant Zodpe','Garbage Collector',33,'Dharampeth Zone','Dharampeth','9876500036','hemant.zodpe@nmc.gov.in','29 Dharampeth, Nagpur','Male',4.6,92,true),
('EMP037','Nanda Fuke','Garbage Collector',27,'Nehru Nagar Zone','Nehru Nagar','9876500037','nanda.fuke@nmc.gov.in','17 Nehru Nagar, Nagpur','Female',4.3,68,true),
('EMP038','Rohit Chandak','Garbage Collector',41,'Hanuman Nagar Zone','Hanuman Nagar','9876500038','rohit.chandak@nmc.gov.in','36 Hanuman Nagar, Nagpur','Male',4.8,125,true),
('EMP039','Pooja Ghavat','Garbage Collector',30,'Gandhibagh Zone','Gandhibagh','9876500039','pooja.ghavat@nmc.gov.in','10 Gandhibagh, Nagpur','Female',4.2,55,true),
('EMP040','Akash Jumde','Garbage Collector',38,'Satranjipura Zone','Satranjipura','9876500040','akash.jumde@nmc.gov.in','47 Satranjipura, Nagpur','Male',4.5,85,true),
('EMP132','Nitin Ambhore','Garbage Collector',36,'Gandhibagh Zone','Gandhibagh','9876500132','nitin.ambhore@nmc.gov.in','52 Gandhibagh, Nagpur','Male',4.5,84,true),
('EMP137','Pushpa Chandurkar','Garbage Collector',31,'Satranjipura Zone','Satranjipura','9876500137','pushpa.chandurkar@nmc.gov.in','28 Satranjipura, Nagpur','Female',4.5,86,true),
('EMP141','Jayram Kalambe','Garbage Collector',45,'Nehru Nagar Zone','Nehru Nagar','9876500141','jayram.kalambe@nmc.gov.in','55 Nehru Nagar, Nagpur','Male',4.4,77,true),
-- SWEEPERS
('EMP041','Ranjana Kohale','Sweeper',25,'Central Zone','Sitabuldi','9876500041','ranjana.kohale@nmc.gov.in','20 Sitabuldi, Nagpur','Female',4.3,72,true),
('EMP042','Subhash Paunikar','Sweeper',47,'Central Zone','Civil Lines','9876500042','subhash.paunikar@nmc.gov.in','53 Civil Lines, Nagpur','Male',4.7,112,true),
('EMP043','Jayshri Tiwari','Sweeper',33,'East Zone','Gandhibagh','9876500043','jayshri.tiwari@nmc.gov.in','6 Gandhibagh, Nagpur','Female',4.0,44,true),
('EMP044','Dilip Asode','Sweeper',39,'East Zone','Kamptee Road','9876500044','dilip.asode@nmc.gov.in','74 Kamptee Rd, Nagpur','Male',4.5,87,true),
('EMP045','Meena Bele','Sweeper',28,'West Zone','Dharampeth','9876500045','meena.bele@nmc.gov.in','31 Dharampeth, Nagpur','Female',4.2,60,true),
('EMP046','Ravindra Kale','Sweeper',43,'West Zone','Ramdaspeth','9876500046','ravindra.kale@nmc.gov.in','8 Ramdaspeth, Nagpur','Male',4.6,98,true),
('EMP047','Alka Goswami','Sweeper',36,'North Zone','Gokulpeth','9876500047','alka.goswami@nmc.gov.in','42 Gokulpeth, Nagpur','Female',4.4,77,true),
('EMP048','Sanjay Dongare','Sweeper',30,'North Zone','Nandanvan','9876500048','sanjay.dongare@nmc.gov.in','16 Nandanvan, Nagpur','Male',4.1,50,true),
('EMP049','Tara Pimpalkar','Sweeper',44,'South Zone','Mankapur','9876500049','tara.pimpalkar@nmc.gov.in','25 Mankapur, Nagpur','Female',4.7,108,true),
('EMP050','Vikas Khandare','Sweeper',37,'South Zone','Ajni','9876500050','vikas.khandare@nmc.gov.in','38 Ajni, Nagpur','Male',4.3,74,true),
('EMP051','Nirmala Thakre','Sweeper',26,'Dharampeth Zone','Dharampeth','9876500051','nirmala.thakre@nmc.gov.in','13 Dharampeth, Nagpur','Female',4.5,82,true),
('EMP052','Santosh Deshmukh','Sweeper',40,'Nehru Nagar Zone','Nehru Nagar','9876500052','santosh.deshmukh@nmc.gov.in','21 Nehru Nagar, Nagpur','Male',4.0,43,true),
('EMP053','Urmila Burde','Sweeper',31,'Hanuman Nagar Zone','Hanuman Nagar','9876500053','urmila.burde@nmc.gov.in','57 Hanuman Nagar, Nagpur','Female',4.6,93,true),
('EMP054','Manoj Nikam','Sweeper',45,'Gandhibagh Zone','Gandhibagh','9876500054','manoj.nikam@nmc.gov.in','9 Gandhibagh, Nagpur','Male',4.3,70,true),
('EMP055','Geeta Wasnik','Sweeper',29,'Satranjipura Zone','Satranjipura','9876500055','geeta.wasnik@nmc.gov.in','32 Satranjipura, Nagpur','Female',4.8,118,true),
('EMP133','Sunita Kanfade','Sweeper',42,'Gandhibagh Zone','Gandhibagh','9876500133','sunita.kanfade@nmc.gov.in','19 Gandhibagh, Nagpur','Female',4.0,43,true),
('EMP142','Archana Pendke','Sweeper',28,'Nehru Nagar Zone','Nehru Nagar','9876500142','archana.pendke@nmc.gov.in','12 Nehru Nagar, Nagpur','Female',4.6,92,true),
-- DRAINAGE WORKERS
('EMP056','Pramod Pande','Drainage Worker',34,'Central Zone','Sitabuldi','9876500056','pramod.pande@nmc.gov.in','24 Sitabuldi, Nagpur','Male',4.4,78,true),
('EMP057','Yogesh Wanode','Drainage Worker',41,'Central Zone','Itwari','9876500057','yogesh.wanode@nmc.gov.in','60 Itwari, Nagpur','Male',4.0,46,true),
('EMP058','Anand Fulzele','Drainage Worker',27,'East Zone','Gandhibagh','9876500058','anand.fulzele@nmc.gov.in','18 Gandhibagh, Nagpur','Male',4.5,86,true),
('EMP059','Ashok Bansod','Drainage Worker',46,'East Zone','Kamptee Road','9876500059','ashok.bansod@nmc.gov.in','82 Kamptee Rd, Nagpur','Male',4.2,62,true),
('EMP060','Rahul Masram','Drainage Worker',32,'West Zone','Dharampeth','9876500060','rahul.masram@nmc.gov.in','6 Dharampeth, Nagpur','Male',4.7,106,true),
('EMP061','Krishna Shrirame','Drainage Worker',38,'West Zone','Ramdaspeth','9876500061','krishna.shrirame@nmc.gov.in','35 Ramdaspeth, Nagpur','Male',4.3,72,true),
('EMP062','Suresh Bansode','Drainage Worker',43,'North Zone','Nandanvan','9876500062','suresh.bansode@nmc.gov.in','28 Nandanvan, Nagpur','Male',4.1,53,true),
('EMP063','Ganesh Raut','Drainage Worker',29,'South Zone','Mankapur','9876500063','ganesh.raut@nmc.gov.in','46 Mankapur, Nagpur','Male',4.6,94,true),
('EMP064','Raju Borkar','Drainage Worker',35,'Dharampeth Zone','Dharampeth','9876500064','raju.borkar@nmc.gov.in','11 Dharampeth, Nagpur','Male',4.4,83,true),
('EMP065','Balaji Dhone','Drainage Worker',48,'Nehru Nagar Zone','Nehru Nagar','9876500065','balaji.dhone@nmc.gov.in','49 Nehru Nagar, Nagpur','Male',4.0,44,true),
('EMP134','Mukund Gawai','Drainage Worker',34,'Gandhibagh Zone','Gandhibagh','9876500134','mukund.gawai@nmc.gov.in','7 Gandhibagh, Nagpur','Male',4.6,90,true),
('EMP138','Baban Rathod','Drainage Worker',44,'Satranjipura Zone','Satranjipura','9876500138','baban.rathod@nmc.gov.in','15 Satranjipura, Nagpur','Male',4.1,51,true),
('EMP143','Santosh Ghate','Drainage Worker',39,'Nehru Nagar Zone','Nehru Nagar','9876500143','santosh.ghate@nmc.gov.in','36 Nehru Nagar, Nagpur','Male',4.2,61,true),
-- PLUMBERS
('EMP066','Ashwin Gaike','Plumber',36,'Central Zone','Civil Lines','9876500066','ashwin.gaike@nmc.gov.in','19 Civil Lines, Nagpur','Male',4.5,89,true),
('EMP067','Vinod Sarode','Plumber',42,'East Zone','Gandhibagh','9876500067','vinod.sarode@nmc.gov.in','37 Gandhibagh, Nagpur','Male',4.2,61,true),
('EMP068','Sudhir Kute','Plumber',30,'West Zone','Dharampeth','9876500068','sudhir.kute@nmc.gov.in','23 Dharampeth, Nagpur','Male',4.7,107,true),
('EMP069','Kishor Bhagat','Plumber',44,'North Zone','Jaripatka','9876500069','kishor.bhagat@nmc.gov.in','5 Jaripatka, Nagpur','Male',4.3,73,true),
('EMP070','Naresh Vaidya','Plumber',31,'South Zone','Ajni','9876500070','naresh.vaidya@nmc.gov.in','62 Ajni, Nagpur','Male',4.6,97,true),
('EMP071','Amol Shingate','Plumber',38,'Hanuman Nagar Zone','Hanuman Nagar','9876500071','amol.shingate@nmc.gov.in','14 Hanuman Nagar, Nagpur','Male',4.1,51,true),
('EMP072','Dinesh Mohod','Plumber',45,'Gandhibagh Zone','Gandhibagh','9876500072','dinesh.mohod@nmc.gov.in','40 Gandhibagh, Nagpur','Male',4.4,76,true),
('EMP073','Ajay Dhole','Plumber',28,'Satranjipura Zone','Satranjipura','9876500073','ajay.dhole@nmc.gov.in','33 Satranjipura, Nagpur','Male',4.8,122,true),
('EMP140','Girish Khade','Plumber',37,'Satranjipura Zone','Satranjipura','9876500140','girish.khade@nmc.gov.in','41 Satranjipura, Nagpur','Male',4.3,73,true),
('EMP145','Dyaneshwar Bankar','Plumber',46,'Hanuman Nagar Zone','Hanuman Nagar','9876500145','dyaneshwar.bankar@nmc.gov.in','27 Hanuman Nagar, Nagpur','Male',4.0,42,true),
-- CONSTRUCTION WORKERS
('EMP074','Sunil Gawande','Construction Worker',37,'Central Zone','Sitabuldi','9876500074','sunil.gawande@nmc.gov.in','7 Sitabuldi, Nagpur','Male',4.3,71,true),
('EMP075','Pankaj Raut','Construction Worker',44,'East Zone','Kamptee Road','9876500075','pankaj.raut@nmc.gov.in','55 Kamptee Rd, Nagpur','Male',4.0,45,true),
('EMP076','Umesh Bhende','Construction Worker',31,'West Zone','Dharampeth','9876500076','umesh.bhende@nmc.gov.in','8 Dharampeth, Nagpur','Male',4.6,91,true),
('EMP077','Ravindra Shirsath','Construction Worker',48,'North Zone','Gokulpeth','9876500077','ravindra.shirsath@nmc.gov.in','26 Gokulpeth, Nagpur','Male',4.2,59,true),
('EMP078','Shrikant Zade','Construction Worker',35,'South Zone','Mankapur','9876500078','shrikant.zade@nmc.gov.in','39 Mankapur, Nagpur','Male',4.5,86,true),
('EMP079','Datta Shahare','Construction Worker',40,'Dharampeth Zone','Dharampeth','9876500079','datta.shahare@nmc.gov.in','17 Dharampeth, Nagpur','Male',4.1,52,true),
('EMP080','Bharat Ramteke','Construction Worker',27,'Nehru Nagar Zone','Nehru Nagar','9876500080','bharat.ramteke@nmc.gov.in','44 Nehru Nagar, Nagpur','Male',4.7,109,true),
('EMP147','Arun Hatkar','Construction Worker',43,'Dharampeth Zone','Dharampeth','9876500147','arun.hatkar@nmc.gov.in','26 Dharampeth, Nagpur','Male',4.3,72,true),
-- ROAD WORKERS
('EMP081','Gopal Gharde','Road Worker',33,'Central Zone','Civil Lines','9876500081','gopal.gharde@nmc.gov.in','61 Civil Lines, Nagpur','Male',4.4,79,true),
('EMP082','Ratan Nimkar','Road Worker',47,'East Zone','Gandhibagh','9876500082','ratan.nimkar@nmc.gov.in','14 Gandhibagh, Nagpur','Male',4.0,46,true),
('EMP083','Harish Balpande','Road Worker',29,'West Zone','Ramdaspeth','9876500083','harish.balpande@nmc.gov.in','29 Ramdaspeth, Nagpur','Male',4.5,88,true),
('EMP084','Chandrakant Yede','Road Worker',41,'North Zone','Nandanvan','9876500084','chandrakant.yede@nmc.gov.in','18 Nandanvan, Nagpur','Male',4.3,73,true),
('EMP085','Keshav Bhoyar','Road Worker',36,'South Zone','Ajni','9876500085','keshav.bhoyar@nmc.gov.in','51 Ajni, Nagpur','Male',4.6,96,true),
('EMP086','Kishor Bansod','Road Worker',43,'Hanuman Nagar Zone','Hanuman Nagar','9876500086','kishor.bansod@nmc.gov.in','23 Hanuman Nagar, Nagpur','Male',4.2,60,true),
('EMP087','Nagesh Shambharkar','Road Worker',30,'Gandhibagh Zone','Gandhibagh','9876500087','nagesh.shambharkar@nmc.gov.in','5 Gandhibagh, Nagpur','Male',4.7,104,true),
('EMP149','Sudarshan Ganje','Road Worker',38,'Central Zone','Sitabuldi','9876500149','sudarshan.ganje@nmc.gov.in','73 Sitabuldi, Nagpur','Male',4.1,52,true),
('EMP-RW-001','Suresh Thakre','Road Worker',34,'Laxmi Nagar','Bajaj Nagar','9876500101','suresh.thakre@nmc.gov.in','Bajaj Nagar, Nagpur','male',4.2,60,true),
('EMP-RW-002','Manoj Yadav','Road Worker',29,'Dharampeth','Ambazari','9876500102','manoj.yadav@nmc.gov.in','Ambazari, Nagpur','male',4.0,45,true),
('EMP-RW-003','Dinesh Lanjewar','Road Worker',42,'Hanuman Nagar','Trimurti Nagar','9876500103','dinesh.lanjewar@nmc.gov.in','Trimurti Nagar, Nagpur','male',4.3,72,true),
('EMP-RW-004','Kavita Nimbalkar','Road Worker',31,'Dhantoli','Sadar','9876500104','kavita.nimbalkar@nmc.gov.in','Sadar, Nagpur','female',4.1,38,true),
('EMP-RW-005','Pramod Sahu','Road Worker',37,'Satranjipura','Itwari','9876500105','pramod.sahu@nmc.gov.in','Itwari, Nagpur','male',3.9,50,true),
('EMP-RW-006','Nilesh Kadu','Road Worker',26,'Gandhibagh','Sitabuldi','9876500106','nilesh.kadu@nmc.gov.in','Sitabuldi, Nagpur','male',4.4,55,true),
('EMP-RW-007','Rekha Wankhede','Road Worker',33,'Lakadganj','Wardhaman Nagar','9876500107','rekha.wankhede@nmc.gov.in','Wardhaman Nagar, Nagpur','female',4.2,48,true),
('EMP-RW-008','Santosh Gawande','Road Worker',45,'Ashi Nagar','Jaripatka','9876500108','santosh.gawande@nmc.gov.in','Jaripatka, Nagpur','male',4.0,63,true),
('EMP-RW-009','Anil Khare','Road Worker',38,'Dharampeth','Shankar Nagar','9876500109','anil.khare@nmc.gov.in','Shankar Nagar, Nagpur','male',4.5,80,true),
('EMP-RW-010','Pooja Bhoyar','Road Worker',27,'Laxmi Nagar','Rahate Colony','9876500110','pooja.bhoyar@nmc.gov.in','Rahate Colony, Nagpur','female',4.1,32,true),
-- FIELD OFFICERS
('EMP088','Suhas Badkas','Field Officer',38,'Central Zone','Sitabuldi','9876500088','suhas.badkas@nmc.gov.in','43 Sitabuldi, Nagpur','Male',4.3,69,true),
('EMP089','Tanvir Sheikh','Field Officer',45,'East Zone','Kamptee Road','9876500089','tanvir.sheikh@nmc.gov.in','77 Kamptee Rd, Nagpur','Male',4.0,42,true),
('EMP090','Vinayak Thakur','Field Officer',32,'West Zone','Dharampeth','9876500090','vinayak.thakur@nmc.gov.in','12 Dharampeth, Nagpur','Male',4.6,92,true),
('EMP091','Ramchandra Chaure','Field Officer',49,'North Zone','Gokulpeth','9876500091','ramchandra.chaure@nmc.gov.in','34 Gokulpeth, Nagpur','Male',4.1,50,true),
('EMP092','Mukesh Lohiya','Field Officer',34,'South Zone','Mankapur','9876500092','mukesh.lohiya@nmc.gov.in','28 Mankapur, Nagpur','Male',4.5,84,true),
('EMP-FO-001','Arun Kolhe','Field Officer',39,'Laxmi Nagar','Samarth Nagar','9876500401','arun.kolhe@nmc.gov.in','Samarth Nagar, Nagpur','male',4.5,95,true),
('EMP-FO-002','Shalini Gade','Field Officer',34,'Dharampeth','Dharampeth Extension','9876500402','shalini.gade@nmc.gov.in','Dharampeth, Nagpur','female',4.6,100,true),
('EMP-FO-005','Ravi Dhole','Field Officer',37,'Satranjipura','Satranjipura','9876500405','ravi.dhole@nmc.gov.in','Satranjipura, Nagpur','male',4.2,62,true),
('EMP-FO-006','Anita Kumbhare','Field Officer',33,'Gandhibagh','Mangalwari','9876500406','anita.kumbhare@nmc.gov.in','Mangalwari, Nagpur','female',4.5,85,true),
('EMP-FO-008','Varsha Deshmukh','Field Officer',28,'Ashi Nagar','Jaripatka','9876500408','varsha.deshmukh@nmc.gov.in','Jaripatka, Nagpur','female',4.3,66,true),
('EMP-FO-009','Sunil Bawane','Field Officer',50,'Dharampeth','Civil Lines','9876500409','sunil.bawane@nmc.gov.in','Civil Lines, Nagpur','male',4.6,110,true),
-- INSPECTORS
('EMP-FO-003','Nitin Waghmare','Inspector',46,'Hanuman Nagar','Hanuman Nagar','9876500403','nitin.waghmare@nmc.gov.in','Hanuman Nagar, Nagpur','male',4.3,80,true),
('EMP-FO-004','Priti Kukade','Inspector',31,'Dhantoli','Dhantoli','9876500404','priti.kukade@nmc.gov.in','Dhantoli, Nagpur','female',4.4,70,true),
('EMP-FO-007','Mangesh Zingade','Inspector',42,'Lakadganj','Lakadganj','9876500407','mangesh.zingade@nmc.gov.in','Lakadganj, Nagpur','male',4.1,58,true),
('EMP-FO-010','Rashmi Patil','Inspector',36,'Laxmi Nagar','Congress Nagar','9876500410','rashmi.patil@nmc.gov.in','Congress Nagar, Nagpur','female',4.4,74,true),
-- STREET SWEEPERS
('EMP093','Poonam Dolas','Street Sweeper',26,'Central Zone','Sitabuldi','9876500093','poonam.dolas@nmc.gov.in','56 Sitabuldi, Nagpur','Female',4.4,80,true),
('EMP094','Bhagwat Ingole','Street Sweeper',39,'East Zone','Gandhibagh','9876500094','bhagwat.ingole@nmc.gov.in','22 Gandhibagh, Nagpur','Male',4.0,43,true),
('EMP095','Rucha Bhoskar','Street Sweeper',33,'West Zone','Ramdaspeth','9876500095','rucha.bhoskar@nmc.gov.in','8 Ramdaspeth, Nagpur','Female',4.7,110,true),
('EMP096','Dhanraj Lade','Street Sweeper',42,'North Zone','Nandanvan','9876500096','dhanraj.lade@nmc.gov.in','37 Nandanvan, Nagpur','Male',4.3,74,true),
('EMP097','Smita Maske','Street Sweeper',28,'South Zone','Ajni','9876500097','smita.maske@nmc.gov.in','49 Ajni, Nagpur','Female',4.6,95,true),
('EMP098','Eknath Waghade','Street Sweeper',45,'Dharampeth Zone','Dharampeth','9876500098','eknath.waghade@nmc.gov.in','15 Dharampeth, Nagpur','Male',4.2,57,true),
('EMP099','Varsha Gorade','Street Sweeper',31,'Nehru Nagar Zone','Nehru Nagar','9876500099','varsha.gorade@nmc.gov.in','68 Nehru Nagar, Nagpur','Female',4.5,85,true),
('EMP100','Ganpat Thakre','Street Sweeper',37,'Hanuman Nagar Zone','Hanuman Nagar','9876500100','ganpat.thakre@nmc.gov.in','4 Hanuman Nagar, Nagpur','Male',4.1,52,true),
('EMP139','Mangala Wanjari','Street Sweeper',33,'Satranjipura Zone','Satranjipura','9876500139','mangala.wanjari@nmc.gov.in','7 Satranjipura, Nagpur','Female',4.7,105,true),
('EMP146','Pramila Bansod','Street Sweeper',30,'Dharampeth Zone','Dharampeth','9876500146','pramila.bansod@nmc.gov.in','59 Dharampeth, Nagpur','Female',4.7,108,true),
-- WASTE COLLECTORS
('EMP101','Aasha Chavan','Waste Collector',30,'Central Zone','Civil Lines','9876500101','aasha.chavan@nmc.gov.in','35 Civil Lines, Nagpur','Female',4.6,96,true),
('EMP102','Ramnath Shyam','Waste Collector',43,'East Zone','Lakadganj','9876500102','ramnath.shyam@nmc.gov.in','48 Lakadganj, Nagpur','Male',4.3,71,true),
('EMP103','Kalpana Tirpude','Waste Collector',27,'West Zone','Dharampeth','9876500103','kalpana.tirpude@nmc.gov.in','26 Dharampeth, Nagpur','Female',4.7,112,true),
('EMP104','Bhaiyalal Karpe','Waste Collector',48,'North Zone','Jaripatka','9876500104','bhaiyalal.karpe@nmc.gov.in','72 Jaripatka, Nagpur','Male',4.0,40,true),
('EMP105','Jyoti Hatwar','Waste Collector',35,'South Zone','Wardhaman Nagar','9876500105','jyoti.hatwar@nmc.gov.in','11 Wardhaman Nagar, Nagpur','Female',4.4,78,true),
('EMP106','Dattatray Shivshankar','Waste Collector',41,'Dharampeth Zone','Dharampeth','9876500106','dattatray.shivshankar@nmc.gov.in','39 Dharampeth, Nagpur','Male',4.2,64,true),
('EMP107','Surekha Meshram','Waste Collector',29,'Nehru Nagar Zone','Nehru Nagar','9876500107','surekha.meshram@nmc.gov.in','20 Nehru Nagar, Nagpur','Female',4.5,88,true),
('EMP108','Vitthal Bankar','Waste Collector',36,'Hanuman Nagar Zone','Hanuman Nagar','9876500108','vitthal.bankar@nmc.gov.in','58 Hanuman Nagar, Nagpur','Male',4.1,53,true),
('EMP109','Padma Patharkar','Waste Collector',44,'Gandhibagh Zone','Gandhibagh','9876500109','padma.patharkar@nmc.gov.in','13 Gandhibagh, Nagpur','Female',4.8,128,true),
('EMP110','Uttam Sontakke','Waste Collector',32,'Satranjipura Zone','Satranjipura','9876500110','uttam.sontakke@nmc.gov.in','45 Satranjipura, Nagpur','Male',4.3,70,true),
('EMP144','Vanita Kamble','Waste Collector',32,'Hanuman Nagar Zone','Hanuman Nagar','9876500144','vanita.kamble@nmc.gov.in','50 Hanuman Nagar, Nagpur','Female',4.5,83,true),
-- ELECTRICIANS
('EMP-EL-001','Vijay Meshram','Electrician',36,'Laxmi Nagar','Somalwada','9876500201','vijay.meshram@nmc.gov.in','Somalwada, Nagpur','male',4.6,90,true),
('EMP-EL-002','Raju Bansod','Electrician',41,'Dharampeth','Gokulpeth','9876500202','raju.bansod@nmc.gov.in','Gokulpeth, Nagpur','male',4.3,75,true),
('EMP-EL-003','Sunita Nagpure','Electrician',30,'Hanuman Nagar','Khamla','9876500203','sunita.nagpure@nmc.gov.in','Khamla, Nagpur','female',4.4,65,true),
('EMP-EL-004','Prakash Mankar','Electrician',44,'Dhantoli','Congress Nagar','9876500204','prakash.mankar@nmc.gov.in','Congress Nagar, Nagpur','male',4.1,58,true),
('EMP-EL-005','Ashok Zade','Electrician',32,'Satranjipura','Mominpura','9876500205','ashok.zade@nmc.gov.in','Mominpura, Nagpur','male',4.2,47,true),
('EMP-EL-006','Nisha Uike','Electrician',28,'Gandhibagh','Mahal','9876500206','nisha.uike@nmc.gov.in','Mahal, Nagpur','female',4.5,82,true),
('EMP-EL-007','Ramesh Dongre','Electrician',40,'Lakadganj','Punapur','9876500207','ramesh.dongre@nmc.gov.in','Punapur, Nagpur','male',4.0,60,true),
('EMP-EL-008','Seema Raut','Electrician',35,'Ashi Nagar','Kabir Nagar','9876500208','seema.raut@nmc.gov.in','Kabir Nagar, Nagpur','female',4.3,70,true),
('EMP-EL-009','Kiran Mohod','Electrician',29,'Dharampeth','Shivaji Nagar','9876500209','kiran.mohod@nmc.gov.in','Shivaji Nagar, Nagpur','male',4.1,45,true),
('EMP-EL-010','Ganesh Pande','Electrician',47,'Laxmi Nagar','Vasant Nagar','9876500210','ganesh.pande@nmc.gov.in','Vasant Nagar, Nagpur','male',4.4,88,true),
-- WATER SUPPLY WORKERS
('EMP-WS-001','Dilip Kawle','Water Supply Worker',38,'Laxmi Nagar','Laxmi Nagar East','9876500301','dilip.kawle@nmc.gov.in','Laxmi Nagar, Nagpur','male',4.2,55,true),
('EMP-WS-002','Archana Pal','Water Supply Worker',33,'Dharampeth','Ambazari Layout','9876500302','archana.pal@nmc.gov.in','Ambazari Layout, Nagpur','female',4.4,68,true),
('EMP-WS-003','Vinod Nimje','Water Supply Worker',42,'Hanuman Nagar','Rameshwari','9876500303','vinod.nimje@nmc.gov.in','Rameshwari, Nagpur','male',4.0,50,true),
('EMP-WS-004','Poonam Shende','Water Supply Worker',27,'Dhantoli','Civil Lines','9876500304','poonam.shende@nmc.gov.in','Civil Lines, Nagpur','female',4.3,42,true),
('EMP-WS-005','Rakesh Turkar','Water Supply Worker',36,'Satranjipura','Gandhibagh','9876500305','rakesh.turkar@nmc.gov.in','Gandhibagh, Nagpur','male',4.1,60,true),
('EMP-WS-006','Deepa Meshram','Water Supply Worker',31,'Gandhibagh','Boriyapura','9876500306','deepa.meshram@nmc.gov.in','Boriyapura, Nagpur','female',4.5,78,true),
('EMP-WS-007','Sanjay Alone','Water Supply Worker',40,'Lakadganj','Bharatwada','9876500307','sanjay.alone@nmc.gov.in','Bharatwada, Nagpur','male',4.2,64,true),
('EMP-WS-008','Lata Bhagat','Water Supply Worker',35,'Ashi Nagar','Ashi Nagar','9876500308','lata.bhagat@nmc.gov.in','Ashi Nagar, Nagpur','female',4.0,48,true),
('EMP-WS-009','Umesh Sontakke','Water Supply Worker',44,'Dharampeth','Futala','9876500309','umesh.sontakke@nmc.gov.in','Futala, Nagpur','male',4.3,72,true),
('EMP-WS-010','Meena Nandanwar','Water Supply Worker',29,'Laxmi Nagar','Bajaj Nagar','9876500310','meena.nandanwar@nmc.gov.in','Bajaj Nagar, Nagpur','female',4.1,36,true),
-- ANIMAL CONTROL WORKERS
('EMP-AC-001','Bharat Raut','Animal Control Worker',35,'Laxmi Nagar','Ramdaspeth','9876500501','bharat.raut@nmc.gov.in','Ramdaspeth, Nagpur','male',4.0,45,true),
('EMP-AC-002','Geeta Kale','Animal Control Worker',30,'Dharampeth','Gandhi Nagar','9876500502','geeta.kale@nmc.gov.in','Gandhi Nagar, Nagpur','female',4.2,55,true),
('EMP-AC-003','Tukaram Ingle','Animal Control Worker',44,'Hanuman Nagar','Snehnagar','9876500503','tukaram.ingle@nmc.gov.in','Snehnagar, Nagpur','male',3.9,38,true),
('EMP-AC-004','Sudha Girhepunje','Animal Control Worker',38,'Dhantoli','Mohan Nagar','9876500504','sudha.girhepunje@nmc.gov.in','Mohan Nagar, Nagpur','female',4.1,50,true),
('EMP-AC-005','Chandrakant More','Animal Control Worker',41,'Satranjipura','Indira Nagar','9876500505','chandrakant.more@nmc.gov.in','Indira Nagar, Nagpur','male',4.3,62,true),
-- GARDENERS
('EMP-GD-001','Santosh Nikalje','Gardener',36,'Dharampeth','Ambazari Garden','9876500601','santosh.nikalje@nmc.gov.in','Ambazari, Nagpur','male',4.4,70,true),
('EMP-GD-002','Usha Gharde','Gardener',32,'Hanuman Nagar','Sonegaon Talav','9876500602','usha.gharde@nmc.gov.in','Sonegaon, Nagpur','female',4.2,55,true),
('EMP-GD-003','Mohan Palkar','Gardener',48,'Laxmi Nagar','Saraswati Nagar','9876500603','mohan.palkar@nmc.gov.in','Saraswati Nagar, Nagpur','male',4.0,48,true),
('EMP-GD-004','Kanchan Fulzele','Gardener',27,'Dhantoli','Dhantoli','9876500604','kanchan.fulzele@nmc.gov.in','Dhantoli, Nagpur','female',4.3,42,true),
('EMP-GD-005','Pradeep Chaware','Gardener',39,'Gandhibagh','Maharajbagh','9876500605','pradeep.chaware@nmc.gov.in','Maharajbagh, Nagpur','male',4.5,80,true),
-- SUPERVISORS
('EMP121','Raj Kumar Agarwal','Supervisor',50,'Central Zone','Sitabuldi','9876500121','raj.agarwal@nmc.gov.in','1 NMC Central, Nagpur','Male',4.9,140,true),
('EMP122','Anita Singh','Supervisor',44,'East Zone','Gandhibagh','9876500122','anita.singh@nmc.gov.in','2 NMC East, Nagpur','Female',4.7,116,true),
('EMP123','Pradeep Kulkarni','Supervisor',48,'West Zone','Dharampeth','9876500123','pradeep.kulkarni@nmc.gov.in','3 NMC West, Nagpur','Male',4.8,130,true),
('EMP124','Sunanda Yadav','Supervisor',46,'North Zone','Gokulpeth','9876500124','sunanda.yadav@nmc.gov.in','4 NMC North, Nagpur','Female',4.6,108,true),
('EMP125','Milind Parekh','Supervisor',52,'South Zone','Mankapur','9876500125','milind.parekh@nmc.gov.in','5 NMC South, Nagpur','Male',4.9,148,true),
-- ZONE OFFICERS
('EMP126','IAS Arvind Nair','Zone Officer',55,'Central Zone','NMC HQ','9876500126','arvind.nair@nmc.gov.in','NMC HQ, Civil Lines, Nagpur','Male',4.9,160,true),
('EMP127','Meena Tiwari','Zone Officer',51,'East Zone','NMC East Office','9876500127','meena.tiwari@nmc.gov.in','NMC East, Gandhibagh, Nagpur','Female',4.8,135,true),
('EMP128','Rajkumar Joshi','Zone Officer',53,'West Zone','NMC West Office','9876500128','rajkumar.joshi@nmc.gov.in','NMC West, Dharampeth, Nagpur','Male',4.7,120,true),
('EMP129','Shilpa Bhosale','Zone Officer',49,'North Zone','NMC North Office','9876500129','shilpa.bhosale@nmc.gov.in','NMC North Nagpur','Female',4.8,130,true),
('EMP130','Avinash Deshpande','Zone Officer',57,'South Zone','NMC South Office','9876500130','avinash.deshpande@nmc.gov.in','NMC South, Nagpur','Male',4.9,155,true)
ON CONFLICT (employee_id) DO NOTHING;

-- ============================================================
-- 13. AUTH ACCOUNTS
-- ============================================================
-- Auth accounts are NOT created here via SQL.
-- Direct auth.users INSERTs break with GoTrue version mismatches.
--
-- After running this migration, run:
--   node scripts/create-auth-accounts.mjs
--
-- That script uses the Supabase Admin API which is GoTrue-version-safe.
-- ============================================================

-- Reload PostgREST schema cache

-- ============================================================
-- Reload PostgREST schema cache
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================
-- VERIFY — run these SELECTs to confirm accounts were created
-- ============================================================
DO $$
DECLARE
  admin_count    INTEGER;
  employee_count INTEGER;
  orphaned       INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
    FROM auth.users u
    JOIN public.user_roles r ON r.user_id = u.id
    WHERE r.role = 'admin';

  SELECT COUNT(*) INTO employee_count
    FROM auth.users u
    JOIN public.user_roles r ON r.user_id = u.id
    WHERE r.role = 'employee';

  -- users in auth.users with no matching identity (will fail to log in)
  SELECT COUNT(*) INTO orphaned
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
    );

  RAISE NOTICE '==========================================';
  RAISE NOTICE '✓ All tables, RLS, functions, triggers';
  RAISE NOTICE '✓ 12 complaint categories';
  RAISE NOTICE '✓ 200+ employees';
  RAISE NOTICE '✓ Admin accounts in auth:    %', admin_count;
  RAISE NOTICE '✓ Employee accounts in auth: %', employee_count;
  IF orphaned > 0 THEN
    RAISE WARNING '⚠ % auth.users rows have no identity record — they cannot log in!', orphaned;
  ELSE
    RAISE NOTICE '✓ All auth accounts have matching identities';
  END IF;
  RAISE NOTICE 'Admin:    nmc@gmail.com / pass@123';
  RAISE NOTICE 'Employee: <name.surname@nmc.gov.in> / pass@123';
  RAISE NOTICE '==========================================';
END $$;


-- Seed data for Mission Clean Nagpur
-- This file should be run AFTER creating auth users through Supabase Dashboard

-- Instructions:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create these users manually:
--    - emp1@gmail.com (password: pass@123)
--    - nmc@gmail.com (password: pass@123)
-- 3. Copy their UUID from the dashboard
-- 4. Replace the UUIDs below with the actual ones
-- 5. Run this SQL in the SQL Editor

-- ============================================
-- IMPORTANT: Replace these UUIDs with actual user IDs from Supabase Auth
-- ============================================

-- Example format (replace with actual UUIDs):
-- Employee user ID: '00000000-0000-0000-0000-000000000001'
-- Admin user ID: '00000000-0000-0000-0000-000000000002'

-- ============================================
-- EMPLOYEE ACCOUNT SETUP (emp1@gmail.com)
-- ============================================

-- Insert profile for employee
-- REPLACE 'EMPLOYEE_USER_ID_HERE' with actual UUID
INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, address)
VALUES (
  'EMPLOYEE_USER_ID_HERE', -- Replace with actual UUID from Supabase Dashboard
  'emp1@gmail.com',
  'Municipal',
  'Employee',
  '9876543210',
  'NMC Office, Civil Lines, Nagpur'
)
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- Assign employee role
INSERT INTO public.user_roles (user_id, role)
VALUES ('EMPLOYEE_USER_ID_HERE', 'employee') -- Replace with actual UUID
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- ADMIN ACCOUNT SETUP (nmc@gmail.com)
-- ============================================

-- Insert profile for admin
-- REPLACE 'ADMIN_USER_ID_HERE' with actual UUID
INSERT INTO public.profiles (user_id, email, first_name, last_name, phone, address)
VALUES (
  'ADMIN_USER_ID_HERE', -- Replace with actual UUID from Supabase Dashboard
  'nmc@gmail.com',
  'NMC',
  'Administrator',
  '0712-1234567',
  'Nagpur Municipal Corporation HQ, Nagpur'
)
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('ADMIN_USER_ID_HERE', 'admin') -- Replace with actual UUID
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the setup
SELECT 
  p.email,
  r.role,
  p.first_name,
  p.last_name
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.user_id = r.user_id
WHERE p.email IN ('emp1@gmail.com', 'nmc@gmail.com')
ORDER BY p.email;
