-- Comprehensive audit of the pixels table
-- This will show current state, policies, and any potential issues

\echo '🔍 SUPABASE PIXELS TABLE AUDIT'
\echo '================================'

\echo ''
\echo '📋 1. TABLE STRUCTURE:'
\d pixels;

\echo ''
\echo '🔒 2. CURRENT RLS POLICIES:'
SELECT 
    schemaname,
    tablename, 
    policyname, 
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'pixels'
ORDER BY cmd, policyname;

\echo ''
\echo '📊 3. DATA STATISTICS:'
SELECT 
    COUNT(*) as total_pixels,
    COUNT(DISTINCT room) as unique_rooms,
    MIN(x) as min_x,
    MAX(x) as max_x,
    MIN(y) as min_y,
    MAX(y) as max_y,
    COUNT(DISTINCT color) as unique_colors
FROM pixels;

\echo ''
\echo '🚨 4. POTENTIALLY PROBLEMATIC DATA:'
\echo 'Pixels outside expected 32x32 grid (x,y should be 0-31):'
SELECT room, x, y, color, author, timestamp 
FROM pixels 
WHERE x < 0 OR x >= 32 OR y < 0 OR y >= 32
ORDER BY x, y
LIMIT 10;

\echo ''
\echo '🎨 5. SAMPLE DATA (first 10 pixels):'
SELECT room, x, y, color, author, timestamp 
FROM pixels 
ORDER BY timestamp DESC 
LIMIT 10;

\echo ''
\echo '🏠 6. ROOMS OVERVIEW:'
SELECT 
    room,
    COUNT(*) as pixel_count,
    MIN(timestamp) as first_pixel,
    MAX(timestamp) as last_pixel
FROM pixels 
GROUP BY room 
ORDER BY pixel_count DESC
LIMIT 10;

\echo ''
\echo '⚠️  7. DATA VALIDATION ISSUES:'
\echo 'Invalid colors (not 6-char hex):'
SELECT room, x, y, color, author
FROM pixels 
WHERE color !~ '^#[0-9A-Fa-f]{6}$'
LIMIT 5;

\echo ''
\echo 'Null or empty rooms:'
SELECT COUNT(*) as count_null_rooms
FROM pixels 
WHERE room IS NULL OR room = '';

\echo ''
\echo 'Very long room names (>50 chars):'
SELECT room, length(room) as room_length
FROM pixels 
WHERE length(room) > 50
LIMIT 5;

\echo ''
\echo '✅ AUDIT COMPLETE'