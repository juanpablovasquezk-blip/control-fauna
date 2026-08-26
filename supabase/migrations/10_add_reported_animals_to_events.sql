-- Migration 10: Reported animals count and species for events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reported_animal_count INT DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reported_species TEXT DEFAULT 'Perro';
