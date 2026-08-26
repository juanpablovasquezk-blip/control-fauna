-- Migration 09: External Handover support for events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS handover_person_name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS handover_entity TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS handover_id_photo_url TEXT;
