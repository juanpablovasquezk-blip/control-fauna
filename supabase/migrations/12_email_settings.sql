-- Migration 12: Initial email settings for fence damage notifications
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value) VALUES (
    'email_config',
    '{"enabled": true, "cc_emails": ["juanpablo.vasquez@minerquim.cl"]}'::jsonb
) ON CONFLICT (key) DO NOTHING;
