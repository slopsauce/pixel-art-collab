-- Update RLS policies for 32x32 grid
-- Run this script to update pixel grid bounds from 16x16 to 32x32

-- Drop existing policies
DROP POLICY IF EXISTS "Allow inserts for valid pixels" ON pixels;
DROP POLICY IF EXISTS "Allow updates for valid pixels" ON pixels;

-- Create new INSERT policy with 32x32 bounds (0-31)
CREATE POLICY "Allow inserts for valid pixels" ON pixels
FOR INSERT WITH CHECK (
  room IS NOT NULL AND
  length(room) <= 50 AND
  x >= 0 AND x < 32 AND
  y >= 0 AND y < 32 AND
  color ~ '^#[0-9A-Fa-f]{6}$' AND
  author IS NOT NULL
);

-- Create new UPDATE policy with 32x32 bounds (0-31)
CREATE POLICY "Allow updates for valid pixels" ON pixels  
FOR UPDATE USING (
  room IS NOT NULL AND
  length(room) <= 50 AND
  x >= 0 AND x < 32 AND
  y >= 0 AND y < 32
) WITH CHECK (
  color ~ '^#[0-9A-Fa-f]{6}$' AND
  author IS NOT NULL
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'pixels';