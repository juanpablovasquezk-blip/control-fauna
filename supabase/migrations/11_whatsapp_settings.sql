-- Migration 11: System settings table for WhatsApp config & photo_url column on kennel_cleanings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated full access to system_settings"
ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Initial default config for UltraMsg WhatsApp API
INSERT INTO public.system_settings (key, value) VALUES (
    'ultramsg_config',
    '{"enabled": true, "instance_id": "", "token": "", "default_group_id": ""}'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Ensure photo_url column exists on kennel_cleanings table
ALTER TABLE public.kennel_cleanings ADD COLUMN IF NOT EXISTS photo_url TEXT;
