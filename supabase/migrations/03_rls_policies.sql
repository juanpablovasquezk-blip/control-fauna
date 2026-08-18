-- ==============================================================================
-- POLÍTICAS RLS DE SEGURIDAD (ROW LEVEL SECURITY)
-- ==============================================================================

-- 1. TABLA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated update profiles" ON public.profiles;
CREATE POLICY "Allow authenticated update profiles" ON public.profiles FOR ALL USING (true);

-- 2. TABLA CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public/authenticated read clients" ON public.clients;
CREATE POLICY "Allow public/authenticated read clients" ON public.clients FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated write clients" ON public.clients;
CREATE POLICY "Allow authenticated write clients" ON public.clients FOR ALL USING (true);

-- 3. TABLA SERVICES
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read services" ON public.services;
CREATE POLICY "Allow authenticated read services" ON public.services FOR SELECT USING (true);

-- 4. TABLA CLIENT_SERVICES
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read client_services" ON public.client_services;
CREATE POLICY "Allow authenticated read client_services" ON public.client_services FOR SELECT USING (true);

-- 5. TABLA PEST_CONTROL_RECORDS (Caza)
ALTER TABLE public.pest_control_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read pest_control" ON public.pest_control_records;
CREATE POLICY "Allow authenticated read pest_control" ON public.pest_control_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert pest_control" ON public.pest_control_records;
CREATE POLICY "Allow authenticated insert pest_control" ON public.pest_control_records FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update pest_control" ON public.pest_control_records;
CREATE POLICY "Allow authenticated update pest_control" ON public.pest_control_records FOR UPDATE USING (true);

-- 6. OTRAS TABLAS OPERACIONALES
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read rounds" ON public.rounds;
CREATE POLICY "Allow authenticated read rounds" ON public.rounds FOR ALL USING (true);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read events" ON public.events;
CREATE POLICY "Allow authenticated read events" ON public.events FOR ALL USING (true);

ALTER TABLE public.animal_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read animal_records" ON public.animal_records;
CREATE POLICY "Allow authenticated read animal_records" ON public.animal_records FOR ALL USING (true);
