import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

let url = ''
let key = ''

if (fs.existsSync('.env.local')) {
  const envFile = fs.readFileSync('.env.local', 'utf-8')
  envFile.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const k = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      if (k === 'NEXT_PUBLIC_SUPABASE_URL') url = val
      if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') key = val
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') key = val
    }
  })
}

const supabase = createClient(url, key)

async function main() {
  const sql = `
    ALTER TABLE public.pest_control_records
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS duration_minutes INT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completado';
  `

  console.log('Ejecutando rpc sql...')
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
  console.log('Result rpc:', { data, error })
}

main().catch(console.error)
