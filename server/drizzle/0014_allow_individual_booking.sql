-- Add allow_individual_booking column to tracks table
ALTER TABLE "tracks" ADD COLUMN "allow_individual_booking" boolean DEFAULT false NOT NULL;
