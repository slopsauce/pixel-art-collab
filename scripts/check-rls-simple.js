#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkRLS() {
  console.log('🔍 Checking RLS Status...\n')
  
  // Try different ways to check RLS
  const queries = [
    `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'pixels'`,
    `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'pixels'`,
    `SELECT * FROM pg_tables WHERE tablename = 'pixels'`
  ]
  
  for (let i = 0; i < queries.length; i++) {
    try {
      console.log(`Query ${i + 1}: ${queries[i]}`)
      const { data, error } = await supabase.rpc('exec_sql', { query: queries[i] })
      if (!error) {
        console.log('✅ Result:', data)
        break
      } else {
        console.log('❌ Error:', error.message)
      }
    } catch (e) {
      console.log('❌ Exception:', e.message)
    }
  }
  
  // Check policies
  try {
    console.log('\n🔍 Checking policies...')
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'pixels'` 
    })
    if (!error) {
      console.log('✅ Policies found:', data)
    } else {
      console.log('❌ Cannot check policies:', error.message)
    }
  } catch (e) {
    console.log('❌ Policy check failed:', e.message)
  }
}

checkRLS().catch(console.error)