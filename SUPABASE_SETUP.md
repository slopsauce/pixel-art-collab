# Supabase Setup Guide for Pixel Art Collaboratif

This guide will help you set up the Supabase backend for the collaborative pixel art application.

## 🚀 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a free account
3. Create a new project
4. Wait for the project to be fully initialized

## 🗃️ 2. Create the Database Table

In the Supabase SQL Editor, execute this command to create the pixels table:

```sql
CREATE TABLE pixels (
  room TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  color TEXT NOT NULL,
  author TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (room, x, y)
);

-- Enable real-time replication
ALTER TABLE pixels REPLICA IDENTITY FULL;

-- Enable Row Level Security
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;
```

## 🔒 3. Set Up Security Policies

Create secure RLS policies that validate data and prevent abuse:

```sql
-- Anyone can view pixels
CREATE POLICY "Anyone can view pixels" ON pixels
FOR SELECT USING (true);

-- Validate pixel data on insert (32x32 grid, hex colors)
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

-- Same validation for updates
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

-- Block anonymous deletes (security measure)
CREATE POLICY "Block anonymous deletes" ON pixels
FOR DELETE USING (auth.role() != 'anon');
```

## ⚡ 4. Enable Real-time Subscriptions

**Option 1 - Via Dashboard (Recommended):**
1. Go to **Database > Replication** in your Supabase dashboard
2. Find the **pixels** table
3. Toggle **Enable** for real-time replication

**Option 2 - Via SQL:**
```sql
-- Enable real-time for the pixels table
ALTER PUBLICATION supabase_realtime ADD TABLE pixels;
```

⚠️ **Important**: Without this step, changes won't sync in real-time between users!

## ⚙️ 5. Configure the Application

1. In Supabase Dashboard, go to **Settings > API**
2. Copy your **Project URL** and **anon/public key**
3. Copy the example config file:
   ```bash
   cp supabase-config.js.example supabase-config.js
   ```
4. Edit `supabase-config.js` with your credentials:
   ```javascript
   export const SUPABASE_URL = 'https://your-project-id.supabase.co'
   export const SUPABASE_ANON_KEY = 'your-anon-key-here'
   ```

## 🎨 6. Launch the Application

Start the development server:

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser to `http://localhost:5173`, connect to a room, and start creating collaborative pixel art!

## 🧪 7. Test the Setup

You can verify everything is working by:

1. **Security Audit**: Run the automated security check
   ```bash
   npm run audit:security
   ```

2. **Manual Testing**: 
   - Open two browser windows
   - Connect both to the same room name
   - Paint pixels and verify they sync in real-time
   - Check that cursors are visible between users

## 🔧 8. Troubleshooting

### Real-time Not Working
- Verify real-time is enabled for the pixels table
- Check browser console for WebSocket errors
- Test with `pixelDebug.checkRealtime()` in browser console

### Security Audit Failing
- Run diagnostics: `npm run audit:table`
- Check for policy conflicts: `npm run fix:policies`
- Verify RLS is enabled on the pixels table

### Connection Issues
- Verify your Supabase URL and anon key are correct
- Check Supabase project status (not paused)
- Test latency: `pixelDebug.testLatency()` in browser console

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)

Your collaborative pixel art application is now ready for real-time collaboration! 🎉