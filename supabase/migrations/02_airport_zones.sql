CREATE TABLE IF NOT EXISTS public.airport_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.airport_zones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to airport_zones" ON public.airport_zones FOR SELECT USING (true);
CREATE POLICY "Allow admin write access to airport_zones" ON public.airport_zones FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default zones
INSERT INTO public.airport_zones (name) VALUES
('Zona Umbral Pista 35L'),
('Zona Umbral Pista 17R'),
('Perímetro Norte Carga'),
('Perímetro Sur Terminal'),
('Calle de Rodaje Alpha')
ON CONFLICT (name) DO NOTHING;
