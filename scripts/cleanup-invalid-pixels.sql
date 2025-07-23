-- Cleanup script for invalid pixels
-- ⚠️  DANGER: This will DELETE data! Use with caution!

\echo '🧹 CLEANING UP INVALID PIXELS'
\echo '============================='

-- Show what will be deleted first
\echo ''
\echo '🔍 PIXELS TO BE DELETED:'

\echo 'Outside 32x32 grid bounds:'
SELECT COUNT(*) as count_out_of_bounds FROM pixels 
WHERE x < 0 OR x >= 32 OR y < 0 OR y >= 32;

\echo 'Invalid colors:'
SELECT COUNT(*) as count_invalid_colors FROM pixels 
WHERE color !~ '^#[0-9A-Fa-f]{6}$';

\echo 'Invalid rooms:'
SELECT COUNT(*) as count_invalid_rooms FROM pixels 
WHERE room IS NULL OR room = '' OR length(room) > 50;

-- Uncomment these lines to actually DELETE the invalid data:
-- WARNING: This cannot be undone!

/*
\echo ''
\echo '🗑️  DELETING INVALID DATA...'

-- Delete pixels outside 32x32 grid
DELETE FROM pixels WHERE x < 0 OR x >= 32 OR y < 0 OR y >= 32;
\echo 'Deleted out-of-bounds pixels'

-- Delete pixels with invalid colors  
DELETE FROM pixels WHERE color !~ '^#[0-9A-Fa-f]{6}$';
\echo 'Deleted invalid color pixels'

-- Delete pixels with invalid rooms
DELETE FROM pixels WHERE room IS NULL OR room = '' OR length(room) > 50;
\echo 'Deleted invalid room pixels'

\echo '✅ CLEANUP COMPLETE'
*/

\echo ''
\echo '⚠️  To actually delete invalid data, edit this script and uncomment the DELETE statements'