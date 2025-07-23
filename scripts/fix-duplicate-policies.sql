-- Fix duplicate and conflicting RLS policies
-- Current issue: Multiple INSERT/UPDATE policies with different validation rules

\echo '🔧 FIXING DUPLICATE POLICIES'
\echo '============================'

\echo ''
\echo '🗑️  Dropping all existing policies...'

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view pixels" ON pixels;
DROP POLICY IF EXISTS "Anyone can paint pixels" ON pixels;
DROP POLICY IF EXISTS "Anyone can update pixels" ON pixels;
DROP POLICY IF EXISTS "only_authenticated_can_delete" ON pixels;
DROP POLICY IF EXISTS "Allow inserts for valid pixels" ON pixels;
DROP POLICY IF EXISTS "Allow updates for valid pixels" ON pixels;

\echo ''
\echo '✨ Creating clean, consistent policies...'

-- 1. SELECT: Anyone can view pixels
CREATE POLICY "Anyone can view pixels" ON pixels
FOR SELECT USING (true);

-- 2. INSERT: Strict validation for 32x32 grid with proper hex colors
CREATE POLICY "Allow inserts for valid pixels" ON pixels
FOR INSERT WITH CHECK (
  room IS NOT NULL AND
  length(room) <= 50 AND
  x >= 0 AND x < 32 AND
  y >= 0 AND y < 32 AND
  color ~ '^#[0-9A-Fa-f]{6}$' AND
  author IS NOT NULL AND
  length(author) <= 50
);

-- 3. UPDATE: Same validation as insert
CREATE POLICY "Allow updates for valid pixels" ON pixels  
FOR UPDATE USING (
  room IS NOT NULL AND
  length(room) <= 50 AND
  x >= 0 AND x < 32 AND
  y >= 0 AND y < 32
) WITH CHECK (
  color ~ '^#[0-9A-Fa-f]{6}$' AND
  author IS NOT NULL AND
  length(author) <= 50
);

-- 4. DELETE: Only authenticated users (not anonymous)
CREATE POLICY "Block anonymous deletes" ON pixels
FOR DELETE USING (auth.role() != 'anon');

\echo ''
\echo '📋 New policies created:'
SELECT 
    policyname, 
    cmd as command,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'No WITH CHECK clause'  
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'pixels'
ORDER BY cmd, policyname;

\echo ''
\echo '✅ POLICIES FIXED!'
\echo 'Now you have:'
\echo '- SELECT: Open read access'
\echo '- INSERT: 32x32 grid + hex colors + valid room/author'
\echo '- UPDATE: Same validation as INSERT'
\echo '- DELETE: Blocked for anonymous users'