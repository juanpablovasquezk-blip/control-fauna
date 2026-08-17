-- ==============================================================================
-- CONTROL DE FAUNA AEROPORTUARIO - GRUPO MINERQUIM
-- Migración SQL Inicial 01_initial_schema.sql
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS DE ROLES Y ESTADOS
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'canes', 'caza', 'client');
CREATE TYPE species_type AS ENUM ('Perro', 'Gato', 'Murciélago', 'Conejo', 'Paloma');
CREATE TYPE animal_sex AS ENUM ('Macho', 'Hembra', 'Indeterminado');
CREATE TYPE animal_size AS ENUM ('Pequeño', 'Mediano', 'Grande');
CREATE TYPE apparent_age AS ENUM ('Cachorro/juvenil', 'Adulto', 'Senior', 'Indeterminada');
CREATE TYPE animal_status AS ENUM ('Capturado', 'En canil', 'Entregado', 'Pendiente Adopción', 'Finalizado', 'Liberado', 'Escapó');
CREATE TYPE event_result AS ENUM ('Captura total', 'Captura parcial', 'Animales escaparon', 'Sin hallazgo');
CREATE TYPE urgency_level AS ENUM ('Normal', 'Urgente', 'Crítica');
CREATE TYPE request_status AS ENUM ('Pendiente', 'En curso', 'Completada', 'Cancelada');

-- 3. TABLA DE PERFILES DE USUARIO (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'canes',
    phone TEXT,
    rut TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    rut TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    notification_emails TEXT[], -- Lista de correos para intervenciones
    address TEXT,
    is_contract_client BOOLEAN NOT NULL DEFAULT false, -- true para DGAC (sin cobro por animal)
    can_request_service BOOLEAN NOT NULL DEFAULT true, -- false para DGAC
    whatsapp_group_id TEXT, -- ID de grupo en ultramsg
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA DE SERVICIOS
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    line TEXT NOT NULL, -- 'Línea 1 - Canes' / 'Línea 2 - Caza'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PRECIOS POR CLIENTE Y SERVICIO
CREATE TABLE IF NOT EXISTS public.client_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    price_per_animal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, service_id)
);

-- 7. TABLA DE RONDAS (Operadores Canes / Supervisores)
CREATE TABLE IF NOT EXISTS public.rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id UUID NOT NULL REFERENCES public.profiles(id),
    round_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    zone TEXT NOT NULL,
    observations TEXT,
    has_fence_incident BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. INCIDENCIAS EN REJA/PERÍMETRO EN RONDAS
CREATE TABLE IF NOT EXISTS public.fence_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
    damage_description TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    was_repaired BOOLEAN NOT NULL DEFAULT false,
    damage_photo_urls TEXT[] DEFAULT '{}',
    repair_photo_urls TEXT[] DEFAULT '{}',
    email_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ACTIVACIONES / EVENTOS DE INTERVENCIÓN
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_code TEXT NOT NULL UNIQUE, -- Ej: FAU-20260817-0001
    client_id UUID NOT NULL REFERENCES public.clients(id),
    operator_id UUID NOT NULL REFERENCES public.profiles(id),
    event_type TEXT NOT NULL DEFAULT 'Intervención Canes',
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notice_time TIME,
    intervention_time TIME,
    end_time TIME,
    specific_location TEXT NOT NULL,
    airport_zone TEXT NOT NULL,
    situation_description TEXT NOT NULL,
    general_result event_result NOT NULL DEFAULT 'Captura total',
    observations TEXT,
    has_perimeter_damage BOOLEAN NOT NULL DEFAULT false,
    damage_description TEXT,
    damage_photo_urls TEXT[] DEFAULT '{}',
    damage_repaired BOOLEAN NOT NULL DEFAULT false,
    repair_photo_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'En curso',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. REGISTRO INDIVIDUAL DE ANIMAL CAPTURADO (1 por animal)
CREATE TABLE IF NOT EXISTS public.animal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    species species_type NOT NULL,
    sex animal_sex NOT NULL DEFAULT 'Indeterminado',
    size animal_size,
    color_features TEXT,
    apparent_age apparent_age DEFAULT 'Indeterminada',
    apparent_condition TEXT,
    method TEXT,
    observations TEXT,
    photo_urls TEXT[] DEFAULT '{}',
    was_captured BOOLEAN NOT NULL DEFAULT true, -- Solo si es true se cobra y se genera acta
    invoice_pdf_url TEXT,
    animal_status animal_status NOT NULL DEFAULT 'Capturado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. FLUJO DE ADOPCIÓN (Solo Perros)
CREATE TABLE IF NOT EXISTS public.adoption_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL UNIQUE REFERENCES public.animal_records(id) ON DELETE CASCADE,
    microchip_number TEXT NOT NULL,
    adopter_name TEXT NOT NULL,
    adopter_rut TEXT NOT NULL,
    adopter_phone TEXT NOT NULL,
    adopter_address TEXT NOT NULL,
    rnm_pdf_url TEXT NOT NULL, -- PDF de Registro Nacional de Mascotas
    completed_by UUID NOT NULL REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. REGISTRO DE INGRESO Y SALIDA DE CANIL
CREATE TABLE IF NOT EXISTS public.kennel_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id UUID NOT NULL REFERENCES public.animal_records(id) ON DELETE CASCADE,
    species species_type NOT NULL,
    entry_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entry_responsible UUID NOT NULL REFERENCES public.profiles(id),
    exit_datetime TIMESTAMPTZ,
    exit_responsible UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'En canil' -- 'En canil' / 'Retirado'
);

-- 13. ASEO DE CANIL
CREATE TABLE IF NOT EXISTS public.kennel_cleanings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaning_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    operator_id UUID NOT NULL REFERENCES public.profiles(id),
    cleaning_type TEXT NOT NULL, -- 'Limpieza general', 'Desinfección', 'Alimentación y agua'
    observations TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VÍNCULO ASEO <-> ANIMALES PRESENTES
CREATE TABLE IF NOT EXISTS public.cleaning_animals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaning_id UUID NOT NULL REFERENCES public.kennel_cleanings(id) ON DELETE CASCADE,
    animal_id UUID NOT NULL REFERENCES public.animal_records(id) ON DELETE CASCADE
);

-- 14. ACTAS DE ENTREGA DE ANIMAL
CREATE TABLE IF NOT EXISTS public.delivery_acts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    act_number TEXT NOT NULL UNIQUE,
    event_id UUID NOT NULL REFERENCES public.events(id),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    animal_id UUID NOT NULL REFERENCES public.animal_records(id),
    capture_datetime TIMESTAMPTZ NOT NULL,
    capture_location TEXT NOT NULL,
    species species_type NOT NULL,
    sex animal_sex NOT NULL,
    size animal_size,
    color_features TEXT,
    apparent_age apparent_age,
    delivery_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivering_user UUID NOT NULL REFERENCES public.profiles(id),
    receiver_name TEXT NOT NULL,
    receiver_rut TEXT NOT NULL,
    receiver_organization TEXT,
    receiver_address TEXT,
    receiver_phone TEXT,
    receiver_email TEXT,
    observations TEXT,
    annexes JSONB DEFAULT '{"photo_record": true, "rnm_proof": false, "other": null}',
    generated_pdf_url TEXT,
    signed_scan_url TEXT, -- PDF del acta firmada escaneada
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. LIBERACIÓN DE MURCIÉLAGOS
CREATE TABLE IF NOT EXISTS public.bat_releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    capture_datetime TIMESTAMPTZ NOT NULL,
    capture_location TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    release_datetime TIMESTAMPTZ NOT NULL,
    release_location TEXT NOT NULL,
    responsible_id UUID NOT NULL REFERENCES public.profiles(id),
    result_observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. REGISTRO DE CONTROL - CONEJOS Y PALOMAS (CAZA)
CREATE TABLE IF NOT EXISTS public.pest_control_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sector TEXT NOT NULL,
    rabbits_male INT NOT NULL DEFAULT 0,
    rabbits_female INT NOT NULL DEFAULT 0,
    rabbits_total INT NOT NULL DEFAULT 0,
    pigeons INT NOT NULL DEFAULT 0,
    method TEXT NOT NULL,
    result TEXT,
    observations TEXT,
    responsible_id UUID NOT NULL REFERENCES public.profiles(id),
    invoice_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. SOLICITUDES DE SERVICIO (CLIENTES)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    service_type TEXT NOT NULL, -- 'Canes' / 'Caza'
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    urgency urgency_level NOT NULL DEFAULT 'Normal',
    photo_urls TEXT[] DEFAULT '{}',
    status request_status NOT NULL DEFAULT 'Pendiente',
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 18. REPORTES MENSUALES
CREATE TABLE IF NOT EXISTS public.monthly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id),
    report_type TEXT NOT NULL DEFAULT 'Cliente Regular', -- 'Cliente Regular' / 'DGAC Ejecutivo'
    year INT NOT NULL,
    month INT NOT NULL,
    pdf_url TEXT NOT NULL,
    summary_data JSONB NOT NULL DEFAULT '{}',
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS Y FUNCIONES DE AUTH
-- ==============================================================================

-- Crear perfil automáticamente al registrarse un usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role user_role := 'admin';
BEGIN
    BEGIN
        IF (new.raw_user_meta_data->>'role') IS NOT NULL THEN
            assigned_role := (new.raw_user_meta_data->>'role')::user_role;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        assigned_role := 'admin';
    END;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        assigned_role
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- DATOS INICIALES (SEED DATA)
-- ==============================================================================

INSERT INTO public.services (name, line, description) VALUES
('Control y Manejo de Canes (Perros/Gatos)', 'Línea 1 - Canes', 'Captura, traslado, custodia temporal en canil y entrega de animales de compañía'),
('Control de Murciélagos', 'Línea 1 - Canes', 'Captura y liberación segura de murciélagos como fauna silvestre'),
('Control y Mitigación de Conejos', 'Línea 2 - Caza', 'Jornadas de control de conejos mediante métodos autorizados SAG'),
('Control y Mitigación de Palomas', 'Línea 2 - Caza', 'Jornadas de control de palomas en área operacional');

INSERT INTO public.clients (name, rut, is_contract_client, can_request_service, address) VALUES
('DGAC - Dirección General de Aeronáutica Civil', '61.200.000-0', true, false, 'Aeropuerto Arturo Merino Benítez'),
('Cliente de Prueba Aeroportuario', '77.888.999-0', false, true, 'Sector Carga, Pudahuel');
