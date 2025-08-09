-- Bug #11: Add server-side validation with database constraints

-- Add constraints for meetups table
ALTER TABLE public.meetups 
ADD CONSTRAINT meetups_title_length_check CHECK (length(title) >= 1 AND length(title) <= 200),
ADD CONSTRAINT meetups_description_length_check CHECK (description IS NULL OR length(description) <= 1000),
ADD CONSTRAINT meetups_location_length_check CHECK (location IS NULL OR length(location) <= 300),
ADD CONSTRAINT meetups_max_attendees_positive_check CHECK (max_attendees IS NULL OR max_attendees > 0),
ADD CONSTRAINT meetups_future_date_check CHECK (date > now());

-- Add constraints for products table  
ALTER TABLE public.products
ADD CONSTRAINT products_name_length_check CHECK (length(name) >= 1 AND length(name) <= 200),
ADD CONSTRAINT products_description_length_check CHECK (description IS NULL OR length(description) <= 1000),
ADD CONSTRAINT products_price_positive_check CHECK (price IS NULL OR price >= 0);

-- Add constraints for library_assets table
ALTER TABLE public.library_assets
ADD CONSTRAINT library_assets_title_length_check CHECK (length(title) >= 1 AND length(title) <= 200),
ADD CONSTRAINT library_assets_description_length_check CHECK (description IS NULL OR length(description) <= 1000);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meetups_date ON public.meetups(date);
CREATE INDEX IF NOT EXISTS idx_meetups_tags ON public.meetups USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_library_assets_file_type ON public.library_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price) WHERE price IS NOT NULL;