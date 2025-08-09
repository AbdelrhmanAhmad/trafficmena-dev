-- Fix Bug 17: Add missing foreign key constraints
-- Add foreign key constraint for library_assets.meetup_id -> meetups.id
ALTER TABLE public.library_assets 
ADD CONSTRAINT fk_library_assets_meetup_id 
FOREIGN KEY (meetup_id) REFERENCES public.meetups(id) ON DELETE SET NULL;

-- Add foreign key constraint for meetup_attendees.meetup_id -> meetups.id  
ALTER TABLE public.meetup_attendees 
ADD CONSTRAINT fk_meetup_attendees_meetup_id 
FOREIGN KEY (meetup_id) REFERENCES public.meetups(id) ON DELETE CASCADE;

-- Add foreign key constraint for meetup_attendees.user_id -> auth.users.id
ALTER TABLE public.meetup_attendees 
ADD CONSTRAINT fk_meetup_attendees_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix Bug 18: Tighten RLS policies for admin-only content

-- Drop existing overly permissive policies on products
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;

-- Create admin-only policies for products
CREATE POLICY "Only admins can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update products" 
ON public.products 
FOR UPDATE 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete products" 
ON public.products 
FOR DELETE 
USING (is_admin());

-- Drop existing overly permissive policies on library_assets
DROP POLICY IF EXISTS "Authenticated users can insert library assets" ON public.library_assets;
DROP POLICY IF EXISTS "Authenticated users can update library assets" ON public.library_assets;

-- Create admin-only policies for library_assets
CREATE POLICY "Only admins can insert library assets" 
ON public.library_assets 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update library assets" 
ON public.library_assets 
FOR UPDATE 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can delete library assets" 
ON public.library_assets 
FOR DELETE 
USING (is_admin());