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
    }
  })
}

const supabase = createClient(url, key)

async function main() {
  console.log('--- 1. Testing rounds query ---')
  const { data: roundsData, error: roundsErr } = await supabase
    .from('rounds')
    .select('*, operator:profiles!operator_id(*), fence_incidents(*)')
    .order('start_time', { ascending: false })
  console.log('Rounds result:', { count: roundsData?.length, error: roundsErr })

  console.log('--- 2. Testing events query ---')
  const { data: eventsData, error: eventsErr } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
  console.log('Events result:', { count: eventsData?.length, error: eventsErr })

  console.log('--- 3. Testing animal_records / kennel query ---')
  const { data: kennelData, error: kennelErr } = await supabase
    .from('animal_records')
    .select('*')
  console.log('Kennel result:', { count: kennelData?.length, error: kennelErr })
}

main().catch(console.error)
