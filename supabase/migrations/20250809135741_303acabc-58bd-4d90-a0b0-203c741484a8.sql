-- TM-MIG-02: One-Time Data Migration Script
-- Purpose: Populate skills, infer experience levels, and create user->skill edges from legacy job_title
-- Notes:
-- - Idempotent: uses ON CONFLICT DO NOTHING and conditional UPDATEs
-- - Wrapped in a single transaction
-- - Backend-only, no schema changes

BEGIN;

-- AC1: Populate the public.skills table (idempotent)
INSERT INTO public.skills (name, category) VALUES
    ('SEO', 'Core Marketing'),
    ('PPC & Paid Media', 'Paid Media'),
    ('Content Marketing', 'Content & Brand'),
    ('Social Media Marketing', 'Content & Brand'),
    ('Growth & Performance Marketing', 'Growth'),
    ('Email & CRM', 'Lifecycle'),
    ('Brand Management', 'Content & Brand'),
    ('Marketing Analytics', 'Data & Analytics')
ON CONFLICT (name) DO NOTHING;

-- AC2: Infer and populate experience_level from legacy job_title when not already set
UPDATE public.profiles
SET experience_level = CASE
    WHEN job_title ILIKE '%Founder%' OR job_title ILIKE '%Owner%' THEN 'Founder / Business Owner'
    WHEN job_title ILIKE '%Director%' OR job_title ILIKE '%Head%' THEN 'Manager / Director'
    WHEN job_title ILIKE '%Manager%' THEN 'Manager / Director'
    WHEN job_title ILIKE '%Senior%' OR job_title ILIKE '%Lead%' THEN 'Senior / Lead (5+ years exp.)'
    WHEN job_title ILIKE '%Specialist%' OR job_title ILIKE '%Executive%' THEN 'Mid-Level (3-5 years exp.)'
    ELSE NULL
END
WHERE experience_level IS NULL;

-- AC3: Create user_skills edges by mapping job_title keywords to skills
-- Helper: inline function-like pattern via repeated inserts, ON CONFLICT to keep idempotent

-- Map SEO
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'SEO'
WHERE p.job_title ILIKE '%SEO%'
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Map PPC & Paid Media
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'PPC & Paid Media'
WHERE (
  p.job_title ILIKE '%PPC%'
  OR p.job_title ILIKE '%Paid Media%'
  OR p.job_title ILIKE '%SEM%'
  OR p.job_title ILIKE '%Google Ads%'
  OR p.job_title ILIKE '%AdWords%'
  OR p.job_title ILIKE '%Meta Ads%'
  OR p.job_title ILIKE '%Facebook Ads%'
)
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Map Content Marketing
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'Content Marketing'
WHERE (
  p.job_title ILIKE '%Content%'
  OR p.job_title ILIKE '%Copywriter%'
  OR p.job_title ILIKE '%Content Writer%'
)
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Map Social Media Marketing
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'Social Media Marketing'
WHERE (
  p.job_title ILIKE '%Social Media%'
  OR p.job_title ILIKE '%SMM%'
  OR p.job_title ILIKE '%Community Manager%'
)
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Map Growth & Performance Marketing
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'Growth & Performance Marketing'
WHERE (
  p.job_title ILIKE '%Growth%'
  OR p.job_title ILIKE '%Performance%'
  OR p.job_title ILIKE '%Acquisition%'
)
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Map Email & CRM
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'Email & CRM'
WHERE (
  p.job_title ILIKE '%Email%'
  OR p.job_title ILIKE '%CRM%'
  OR p.job_title ILIKE '%Lifecycle%'
  OR p.job_title ILIKE '%Retention%'
  OR p.job_title ILIKE '%Automation%'
)
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Map Brand Management
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'Brand Management'
WHERE (
  p.job_title ILIKE '%Brand%'
  OR p.job_title ILIKE '%Brand Manager%'
)
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- Map Marketing Analytics
INSERT INTO public.user_skills (user_id, skill_id)
SELECT p.id, s.id
FROM public.profiles p
JOIN public.skills s ON s.name = 'Marketing Analytics'
WHERE (
  p.job_title ILIKE '%Analytics%'
  OR p.job_title ILIKE '%Data%'
  OR p.job_title ILIKE '%Insights%'
)
ON CONFLICT (user_id, skill_id) DO NOTHING;

COMMIT;