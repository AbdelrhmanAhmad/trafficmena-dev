-- Add accepted status to ECD sponsor inquiries
ALTER TYPE "ecd_sponsor_inquiry_status" ADD VALUE IF NOT EXISTS 'accepted' BEFORE 'rejected';
