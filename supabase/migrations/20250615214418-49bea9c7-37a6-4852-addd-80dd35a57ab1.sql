
-- Create meetups table
CREATE TABLE public.meetups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  max_attendees INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create library_assets table
CREATE TABLE public.library_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_type TEXT NOT NULL, -- 'video', 'pdf', 'presentation', etc.
  file_url TEXT,
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetup_attendees table for tracking meetup registrations
CREATE TABLE public.meetup_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meetup_id UUID REFERENCES public.meetups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meetup_id, user_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_attendees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for meetups (public read, admin write)
CREATE POLICY "Anyone can view meetups" 
  ON public.meetups 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert meetups" 
  ON public.meetups 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meetups" 
  ON public.meetups 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create RLS policies for products (public read, admin write)
CREATE POLICY "Anyone can view products" 
  ON public.products 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert products" 
  ON public.products 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products" 
  ON public.products 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create RLS policies for subscriptions (users can only see their own)
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create RLS policies for library_assets (public read, admin write)
CREATE POLICY "Anyone can view library assets" 
  ON public.library_assets 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can insert library assets" 
  ON public.library_assets 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update library assets" 
  ON public.library_assets 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Create RLS policies for meetup_attendees (users can see their own registrations)
CREATE POLICY "Users can view their own meetup registrations" 
  ON public.meetup_attendees 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can register for meetups" 
  ON public.meetup_attendees 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own registrations" 
  ON public.meetup_attendees 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Update profiles table to include subscription_status
ALTER TABLE public.profiles 
ADD COLUMN subscription_status TEXT DEFAULT 'free';

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER handle_updated_at_meetups
  BEFORE UPDATE ON public.meetups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_library_assets
  BEFORE UPDATE ON public.library_assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
