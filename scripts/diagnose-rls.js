#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function diagnoseRLS() {
  console.log('🔍 Diagnosing RLS Configuration...\n')
  
  // Test 1: Check if we can query system tables for RLS status
  try {
    console.log('1. Checking RLS status via direct query...')
    const { data, error } = await supabase.rpc('check_rls_status')
    console.log('Result:', data, error)
  } catch (error) {
    console.log('   Cannot check RLS status directly (expected with anon key)')
  }
  
  // Test 2: Try raw SQL to see what we can access
  try {
    console.log('\n2. Testing raw SQL access...')
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .limit(5)
    
    console.log('   Can select pixels:', !error)
    console.log('   Rows returned:', data?.length || 0)
    if (error) console.log('   Error:', error.message)
  } catch (error) {
    console.log('   Error:', error.message)
  }
  
  // Test 3: Try to insert completely invalid data
  try {
    console.log('\n3. Testing insert with invalid data (should fail)...')
    const { data, error } = await supabase
      .from('pixels')
      .insert({
        room: 'rls-test',
        x: -999,  // Clearly invalid
        y: -999,  // Clearly invalid
        color: 'INVALID_COLOR_VALUE_THAT_IS_TOO_LONG',
        author: 'rls-test'
      })
    
    if (error) {
      console.log('✅   Insert blocked:', error.message)
    } else {
      console.log('❌   Insert succeeded! RLS not working:', data)
    }
  } catch (error) {
    console.log('✅   Insert blocked by error:', error.message)
  }
  
  // Test 4: Try to delete with specific filter
  try {
    console.log('\n4. Testing delete (should fail)...')
    const { data, error } = await supabase
      .from('pixels')
      .delete()
      .eq('room', 'rls-test')
    
    if (error) {
      console.log('✅   Delete blocked:', error.message)
    } else {
      console.log('❌   Delete succeeded! RLS not working')
    }
  } catch (error) {
    console.log('✅   Delete blocked by error:', error.message)
  }
  
  // Test 5: Check if the table exists at all
  try {
    console.log('\n5. Checking table structure...')
    const { data, error } = await supabase
      .from('pixels')
      .select('*')
      .limit(0) // Just check if table exists
    
    if (error) {
      console.log('❌   Table access error:', error.message)
      if (error.message.includes('does not exist')) {
        console.log('   >>> TABLE DOES NOT EXIST! Create it first.')
      }
    } else {
      console.log('✅   Table exists and is accessible')
    }
  } catch (error) {
    console.log('❌   Table check failed:', error.message)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('DIAGNOSIS COMPLETE')
  console.log('If you see "RLS not working" errors above,')
  console.log('the RLS policies are not properly configured.')
}

diagnoseRLS().catch(console.error)