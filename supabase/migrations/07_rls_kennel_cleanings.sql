-- Migration: Permissive RLS Policies for kennel_cleanings and cleaning_animals
ALTER TABLE public.kennel_cleanings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_animals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to kennel_cleanings" ON public.kennel_cleanings;
CREATE POLICY "Allow authenticated full access to kennel_cleanings"
ON public.kennel_cleanings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to cleaning_animals" ON public.cleaning_animals;
CREATE POLICY "Allow authenticated full access to cleaning_animals"
ON public.cleaning_animals FOR ALL TO authenticated USING (true) WITH CHECK (true);
