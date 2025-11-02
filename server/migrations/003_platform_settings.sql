-- 003_platform_settings.sql — invite-only configuration toggle

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_only_signup BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id)
);

INSERT INTO public.platform_settings (invite_only_signup)
VALUES (false)
ON CONFLICT DO NOTHING;
