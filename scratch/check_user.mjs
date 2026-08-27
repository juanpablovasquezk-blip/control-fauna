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
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') key = val
      if (k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !key) key = val
    }
  })
}

const supabase = createClient(url, key)

async function main() {
  console.log('Buscando usuario juanpablo.vasquezk@gmail.com...')
  
  // 1. Check profiles table
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', 'juanpablo.vasquezk@gmail.com')
    
  console.log('Profile result:', profile, profErr)

  // 2. List auth users
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers()
  if (usersErr) {
    console.error('Error listUsers:', usersErr)
  } else {
    const matchedUser = usersData.users.find(u => u.email?.toLowerCase() === 'juanpablo.vasquezk@gmail.com')
    console.log('Auth user found:', matchedUser ? {
      id: matchedUser.id,
      email: matchedUser.email,
      confirmed_at: matchedUser.email_confirmed_at,
      user_metadata: matchedUser.user_metadata,
      last_sign_in_at: matchedUser.last_sign_in_at
    } : 'NOT FOUND IN AUTH!')
  }
}

main().catch(console.error)
