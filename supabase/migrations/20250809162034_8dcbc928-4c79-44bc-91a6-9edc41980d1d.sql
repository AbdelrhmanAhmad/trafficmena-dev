-- Add new fields to profiles table for enhanced onboarding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_experience integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_completed boolean DEFAULT false;

-- Create skills table with predefined categories
INSERT INTO public.skills (name, category) VALUES
-- Digital Marketing Core
('SEO (Search Engine Optimization)', 'Digital Marketing'),
('SEM (Search Engine Marketing)', 'Digital Marketing'),
('Google Ads', 'Digital Marketing'),
('Facebook Ads', 'Digital Marketing'),
('Instagram Marketing', 'Digital Marketing'),
('LinkedIn Marketing', 'Digital Marketing'),
('Twitter Marketing', 'Digital Marketing'),
('TikTok Marketing', 'Digital Marketing'),
('YouTube Marketing', 'Digital Marketing'),
('Email Marketing', 'Digital Marketing'),
('Content Marketing', 'Digital Marketing'),
('Influencer Marketing', 'Digital Marketing'),
('Affiliate Marketing', 'Digital Marketing'),
('Performance Marketing', 'Digital Marketing'),
('Marketing Automation', 'Digital Marketing'),
('Conversion Rate Optimization', 'Digital Marketing'),

-- Analytics & Data
('Google Analytics', 'Analytics'),
('Facebook Analytics', 'Analytics'),
('Data Analysis', 'Analytics'),
('Marketing Attribution', 'Analytics'),
('A/B Testing', 'Analytics'),
('Customer Journey Mapping', 'Analytics'),
('ROI Analysis', 'Analytics'),
('Marketing Mix Modeling', 'Analytics'),

-- Creative & Design
('Graphic Design', 'Creative'),
('Video Production', 'Creative'),
('Copywriting', 'Creative'),
('Brand Design', 'Creative'),
('UX/UI Design', 'Creative'),
('Photography', 'Creative'),
('Motion Graphics', 'Creative'),

-- Strategy & Management
('Marketing Strategy', 'Strategy'),
('Brand Management', 'Strategy'),
('Project Management', 'Strategy'),
('Team Leadership', 'Strategy'),
('Budget Management', 'Strategy'),
('Stakeholder Management', 'Strategy'),

-- Technical
('HTML/CSS', 'Technical'),
('JavaScript', 'Technical'),
('CRM Management', 'Technical'),
('Marketing Tools', 'Technical'),
('API Integration', 'Technical'),
('Tag Management', 'Technical')
ON CONFLICT (name) DO NOTHING;