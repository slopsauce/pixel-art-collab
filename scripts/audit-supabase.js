#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function auditDatabase() {
  console.log('🔍 Starting Supabase Security Audit...\n')
  
  let hasErrors = false
  
  // Test 1: Can we connect?
  try {
    console.log('✅ 1. Testing connection...')
    const { data, error } = await supabase.from('pixels').select('count').limit(1)
    if (error) throw error
    console.log('   Connection successful')
  } catch (error) {
    console.error('❌   Connection failed:', error.message)
    hasErrors = true
  }
  
  // Test 2: Can anonymous users delete data? (Should fail)
  try {
    console.log('\n🔒 2. Testing DELETE protection...')
    
    // First insert a test row to try to delete
    const testData = {
      room: 'delete-test',
      x: 5,
      y: 5,
      color: '#FF0000',
      author: 'audit-test'
    }
    
    const { error: insertError } = await supabase.from('pixels').insert(testData)
    if (insertError) {
      console.log('   Could not insert test data for DELETE test:', insertError.message)
    } else {
      // Now try to delete it
      const { error: deleteError } = await supabase
        .from('pixels')
        .delete()
        .eq('room', 'delete-test')
        .eq('x', 5)
        .eq('y', 5)
      
      if (deleteError) {
        console.log('✅   DELETE properly blocked:', deleteError.message)
      } else {
        console.error('❌   DELETE allowed! This is dangerous!')
        hasErrors = true
      }
    }
  } catch (error) {
    console.log('✅   DELETE properly blocked by exception:', error.message)
  }
  
  // Test 3: Can we insert invalid data? (Should fail)
  try {
    console.log('\n🔒 3. Testing input validation...')
    const { error } = await supabase.from('pixels').insert({
      room: 'test',
      x: 999,  // Should be blocked (out of range)
      y: 999,
      color: '#FF0000',
      author: 'audit-test'
    })
    if (error) {
      console.log('✅   Invalid data properly rejected:', error.message)
    } else {
      console.error('❌   Invalid data accepted! Check RLS policies!')
      hasErrors = true
    }
  } catch (error) {
    console.log('✅   Invalid data properly rejected')
  }
  
  // Test 4: Check for suspicious data
  try {
    console.log('\n📊 4. Checking existing data...')
    const { data, error } = await supabase
      .from('pixels')
      .select('room, x, y')
      .limit(100)
    
    if (error) throw error
    
    const suspiciousData = data.filter(pixel => 
      pixel.x < 0 || pixel.x >= 32 || 
      pixel.y < 0 || pixel.y >= 32 ||
      !pixel.room || pixel.room.length > 50
    )
    
    if (suspiciousData.length > 0) {
      console.error('❌   Found suspicious data:', suspiciousData)
      hasErrors = true
    } else {
      console.log('✅   Data looks clean')
    }
  } catch (error) {
    console.error('❌   Could not check data:', error.message)
    hasErrors = true
  }
  
  // Test 5: Check table size (prevent spam)
  try {
    console.log('\n📈 5. Checking table size...')
    const { data, error } = await supabase
      .from('pixels')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    
    const count = data || 0
    console.log(`   Total pixels: ${count}`)
    
    if (count > 100000) {
      console.warn('⚠️   Large number of pixels - potential spam?')
    }
  } catch (error) {
    console.error('❌   Could not count pixels:', error.message)
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  if (hasErrors) {
    console.error('❌ SECURITY AUDIT FAILED - Issues found!')
    process.exit(1)
  } else {
    console.log('✅ SECURITY AUDIT PASSED - No issues found!')
  }
}

auditDatabase().catch(error => {
  console.error('❌ Audit failed:', error)
  process.exit(1)
})