-- Migration: Add requested_by column to public.events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requested_by TEXT;
