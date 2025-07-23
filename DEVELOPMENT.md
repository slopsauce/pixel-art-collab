# 🛠 Development Setup

## Local Development Configuration

Since `supabase-config.js` is not tracked in git (for security), you need to create it locally:

### 1. Copy the Example Configuration
```bash
cp supabase-config.js.example supabase-config.js
```

### 2. Fill in Your Supabase Credentials
Edit `supabase-config.js` with your actual Supabase project details:

```javascript
// Configuration Supabase
export const SUPABASE_URL = 'https://your-project-id.supabase.co'
export const SUPABASE_ANON_KEY = 'your-anon-key-here'
```

### 3. Where to Find Your Credentials
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings > API**
4. Copy the **Project URL** and **anon/public key**

## 🚀 Deployment

The production deployment automatically uses GitHub Secrets:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your anon/public key

These are configured in the repository and the deployment workflow automatically generates the config file during build.

## 🔒 Security Notes

- ✅ `supabase-config.js` is in `.gitignore` - never commit it
- ✅ Production uses GitHub Secrets for secure credential management
- ✅ Anon keys are safe for client-side use (protected by RLS policies)
- ✅ Local development and production deployment both work seamlessly

## 📝 Development Workflow

1. **Clone repository**
2. **Set up local config** (see above)
3. **Install dependencies**: `npm install`
4. **Start development**: `npm run dev`
5. **Make changes and commit** (config file won't be included)
6. **Push to main** - deployment happens automatically

Your local `supabase-config.js` stays on your machine and never gets committed!