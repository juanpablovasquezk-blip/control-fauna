-- ==============================================================================
-- CONTROL DE FAUNA AEROPORTUARIO
-- Migración SQL 05_event_closure.sql: Campos para Cierre de Eventos
-- ==============================================================================

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS closure_type TEXT,
ADD COLUMN IF NOT EXISTS closure_observations TEXT,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS damage_location TEXT;

-- Asegurar que la tabla events tenga acceso RLS para update por usuarios autenticados
DROP POLICY IF EXISTS "Allow authenticated update events" ON public.events;
CREATE POLICY "Allow authenticated update events" ON public.events FOR UPDATE USING (true);
