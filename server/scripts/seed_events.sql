-- 002_seed_events.sql — curated initial events for TrafficMENA

INSERT INTO public.events (title, event_description, date, location, max_attendees, event_type, image_url, tags, guest_experts)
VALUES
('Social Media Marketing Mastery for MENA Brands',
 'Learn how to leverage cultural insights, local trends, and platform-specific practices to build engaging campaigns that resonate with MENA audiences.',
 '2025-08-15T18:00:00Z', 'Dubai Internet City, UAE', 50, 'Event',
 '/uploads/trafficmena-event.png',
 ARRAY['social-media','workshop','mena','instagram','content-marketing'],
 jsonb_build_object(
   'main_host', jsonb_build_object('name','Sarah Al-Mahmoud','bio','Senior Digital Marketing Manager at Careem with 8+ years of MENA experience.','image','https://images.unsplash.com/photo-1494790108755-2616b4e53b2e?w=400&h=400&fit=crop'),
   'agenda', jsonb_build_array('18:00-18:30: Registration','18:30-19:15: MENA Landscape','19:15-20:00: Hands-on Workshop','20:00-20:30: Q&A'),
   'learning_outcomes', jsonb_build_array('Advanced targeting for MENA','Platform-specific strategies','Cultural sensitivity','ROI measurement')
  )
),
('E-commerce Growth Hacks: From Startup to Scale in MENA',
 'Market entry strategies, scaling operations across countries, and lessons from successful entrepreneurs in the region.',
 '2025-08-18T19:00:00Z', 'Riyadh Digital Hub, Saudi Arabia', 75, 'Mastermind',
 '/uploads/trafficmena-event.png',
 ARRAY['e-commerce','growth','startup','scaling','marketplace'],
 jsonb_build_object(
   'main_host', jsonb_build_object('name','Ahmed Khalil','bio','Founder of multiple MENA e-commerce ventures ($50M+ revenue).','image','https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop')
  )
),
('Data-Driven Marketing: Advanced Analytics for MENA Markets',
 'Technical seminar covering advanced data analysis techniques, customer behavior insights, and predictive modeling for marketing optimization.',
 '2025-08-22T17:30:00Z', 'Cairo Tech Park, Egypt', 40, 'Event',
 '/uploads/trafficmena-event.png',
 ARRAY['analytics','data-science','modeling','technical'],
 jsonb_build_object(
   'main_host', jsonb_build_object('name','Dr. Fatima Hassan','bio','Lead Data Scientist at Vodafone Egypt, PhD in Statistics.','image','https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop')
  )
),
('Influencer Marketing Excellence: Building Authentic Partnerships',
 'Identify, approach, and collaborate with the right influencers for your brand. Covers contracts, content guidelines, and performance measurement.',
 '2025-08-25T18:30:00Z', 'Amman Design Week Hub, Jordan', 35, 'Event',
 '/uploads/trafficmena-event.png',
 ARRAY['influencer-marketing','partnerships','contracts','roi'],
 jsonb_build_object(
   'main_host', jsonb_build_object('name','Layla Qureshi','bio','Founder of MENA Influence Agency, 200+ influencers represented.','image','https://images.unsplash.com/photo-1590086782792-42dd2350140d?w=400&h=400&fit=crop')
  )
),
('SEO Mastery for Arabic Content: Technical and Strategic Approaches',
 'Optimize for Arabic search queries and regional search behavior. Includes local SEO and technical audit training.',
 '2025-09-01T17:00:00Z', 'Kuwait Innovation Hub, Kuwait', 45, 'Event',
 '/uploads/trafficmena-event.png',
 ARRAY['seo','arabic','local-search','technical'],
 jsonb_build_object(
   'main_host', jsonb_build_object('name','Mariam Al-Zahra','bio','Senior SEO consultant, optimized sites with $10M+ organic value.','image','https://images.unsplash.com/photo-1494790108755-2616b4e53b2e?w=400&h=400&fit=crop')
  )
);
