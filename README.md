# 🎨 Pixel Art Collaboratif

A real-time collaborative pixel art application built with Supabase, featuring live collaboration, user presence, and secure data management.

## ✨ Features

### 🎮 Core Functionality
- **32x32 pixel grid** - High-resolution canvas for detailed artwork
- **Real-time collaboration** - See other users' changes instantly
- **Live cursors** - Watch collaborators paint in real-time
- **User presence** - See who's currently online and painting

### 🎨 Art Tools
- **8 essential colors** - Carefully curated color palette
- **Personal color** - Each user gets a unique color matching their cursor
- **Custom color picker** - Native HTML color picker for infinite possibilities
- **Optimistic updates** - Instant visual feedback while painting

### 🔒 Security & Performance
- **Row Level Security (RLS)** - Database-level access control
- **Input validation** - Prevents malicious data injection
- **Automated security auditing** - GitHub Actions CI/CD pipeline
- **Rate limiting** - Cursor updates throttled for performance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- A Supabase project
- Modern web browser

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/pixel-art-crdt.git
cd pixel-art-crdt
```

### 2. Set Up Supabase

#### Create the Database Table
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

-- Enable Row Level Security
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;
```

#### Create RLS Policies
```sql
-- Anyone can view pixels
CREATE POLICY "Anyone can view pixels" ON pixels
FOR SELECT USING (true);

-- Validate pixel data on insert
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

-- Block anonymous deletes
CREATE POLICY "Block anonymous deletes" ON pixels
FOR DELETE USING (auth.role() != 'anon');
```

### 3. Configure Environment
```bash
# Copy the example configuration
cp supabase-config.js.example supabase-config.js

# Edit supabase-config.js with your Supabase project details
```

Example `supabase-config.js`:
```javascript
export const SUPABASE_URL = 'https://your-project-id.supabase.co'
export const SUPABASE_ANON_KEY = 'your-anon-key-here'
```

### 4. Start Development Server
```bash
# Install dependencies
npm install

# Start Vite development server (recommended)
npm run dev

# Alternative: Simple HTTP server
npm run serve:python
```

### 5. Open in Browser
Navigate to `http://localhost:5173` (Vite) or `http://localhost:8080` (Python server)

## 🎯 Usage

1. **Enter your name** (optional, stored locally)
2. **Connect to a room** - Create or join a collaborative session
3. **Select a color** - Choose from preset colors or use the color picker
4. **Start painting** - Click pixels to paint, drag to draw continuously
5. **Collaborate** - See other users' cursors and changes in real-time

## 🛠 Development

### Project Structure
```
pixel-art-crdt/
├── index.html              # Main HTML file
├── main.js                 # Core application logic
├── style.css               # Styling and layout
├── supabase-config.js      # Database configuration 
├── scripts/                # Utility scripts
│   ├── audit-supabase.js   # Security auditing
│   ├── diagnose-rls.js     # RLS diagnostics
│   ├── audit-table.sh      # Database inspection
│   └── fix-policies.sh     # Policy management
└── .github/workflows/      # CI/CD automation
    └── security-audit.yml  # Automated security testing
```

### Key Components

#### Real-time Synchronization
- **Supabase Realtime** - WebSocket-based live updates
- **Polling fallback** - Ensures reliability when WebSockets fail
- **Optimistic updates** - Immediate local feedback

#### User Presence System
- **Cursor tracking** - Live mouse position sharing
- **User identification** - Random color-coded identities
- **Connection management** - Automatic cleanup on disconnect

#### Security Features
- **Input validation** - Client and server-side checks
- **XSS prevention** - Proper data sanitization
- **Rate limiting** - Performance and abuse protection

### Scripts

#### Security Auditing
```bash
# Run comprehensive security audit
./scripts/audit-table.sh

# Fix duplicate/conflicting policies  
./scripts/fix-policies.sh

# Test specific security scenarios
node scripts/audit-supabase.js
```

#### Development Utilities
```bash
# Debug real-time connection
pixelDebug.checkRealtime()

# Test network latency
pixelDebug.testLatency()

# Inspect local cache
pixelDebug.getPixels()
```

## 🔒 Security

This application implements multiple security layers:

### Database Security
- **Row Level Security (RLS)** - All data access controlled at database level
- **Input validation** - Strict bounds checking and format validation
- **Anonymous user restrictions** - Prevents unauthorized deletions

### Application Security  
- **XSS prevention** - Proper HTML escaping and sanitization
- **CSRF protection** - State validation and secure headers
- **Rate limiting** - Prevents spam and abuse

### Monitoring
- **Automated auditing** - Daily security scans via GitHub Actions
- **Manual testing tools** - Scripts for security validation
- **Real-time monitoring** - Error tracking and anomaly detection

## 🚀 Deployment

### GitHub Pages (Automated) ⭐ Recommended
This repository is configured for automatic deployment to GitHub Pages:

1. **Enable GitHub Pages**:
   - Go to your repository **Settings > Pages**
   - Under **Source**, select **GitHub Actions**
   - The deployment will trigger automatically on every push to `main`

2. **Update Repository Name** (if needed):
   - Edit `vite.config.js` and update the `base` path to match your repository name
   - If your repo is `https://github.com/username/my-repo`, set `base: '/my-repo/'`

3. **Access Your App**:
   - Your app will be available at: `https://slopsauce.github.io/pixel-art-collab/`
   - Updates deploy automatically when you push to main

### Manual Build and Preview
Test the production build locally:
```bash
# Build for production
npm run build

# Preview the built site
npm run preview

# Combined command
npm run deploy:preview
```

### Other Static Hosting Options
Deploy to any static hosting provider:
- **Vercel**: `vercel deploy` or connect your GitHub repo
- **Netlify**: Drag and drop the `dist/` folder or Git integration
- **Surge.sh**: `surge dist/`

### Self-Hosting
```bash
# Using nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/pixel-art-crdt/dist;
    index index.html;
    
    # Handle client-side routing
    try_files $uri $uri/ /index.html;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure security audits pass

## 📈 Performance

### Optimization Features
- **Cursor update throttling** - 20 FPS max for smooth performance
- **Selective rendering** - Only update changed pixels
- **Connection pooling** - Efficient WebSocket management
- **Local caching** - Reduce server requests

### Scalability
- **Room-based isolation** - Each room operates independently  
- **Efficient queries** - Optimized database access patterns
- **Minimal bandwidth** - Only send necessary updates

## 🐛 Troubleshooting

### Common Issues

**Connection Problems**
```javascript
// Check real-time status
pixelDebug.checkRealtime()

// Test database connectivity  
pixelDebug.testLatency()
```

**Security Audit Failures**
```bash
# Run diagnostics
./scripts/audit-table.sh

# Fix common policy conflicts
./scripts/fix-policies.sh
```

**Performance Issues**
- Check browser developer tools for WebSocket errors
- Verify Supabase project limits and usage
- Test with fewer concurrent users

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - Backend-as-a-Service platform
- **Modern web standards** - WebSockets, CSS Grid, ES6+
- **Open source community** - Inspiration and best practices

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/pixel-art-crdt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/pixel-art-crdt/discussions)
- **Security**: Email security issues privately

---

Built with ❤️ using modern web technologies and Supabase.