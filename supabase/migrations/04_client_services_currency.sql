-- ==============================================================================
-- AGREGAR COLUMNA DE UNIDAD DE PRECIO (PESOS / UF) A CLIENT_SERVICES
-- ==============================================================================

ALTER TABLE public.client_services 
ADD COLUMN IF NOT EXISTS price_unit TEXT NOT NULL DEFAULT 'CLP';
