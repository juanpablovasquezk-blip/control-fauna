-- ==============================================================================
-- POLÍTICAS RLS DE SEGURIDAD PARA DELIVERY_ACTS
-- ==============================================================================

ALTER TABLE public.delivery_acts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read delivery_acts" ON public.delivery_acts;
CREATE POLICY "Allow authenticated read delivery_acts" ON public.delivery_acts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert delivery_acts" ON public.delivery_acts;
CREATE POLICY "Allow authenticated insert delivery_acts" ON public.delivery_acts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update delivery_acts" ON public.delivery_acts;
CREATE POLICY "Allow authenticated update delivery_acts" ON public.delivery_acts FOR UPDATE USING (true);
