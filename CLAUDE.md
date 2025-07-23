# CLAUDE.md - Project Context for AI Assistants

This file provides comprehensive context about the Pixel Art Collaboratif project for AI assistants (Claude, GPT, etc.) to understand the codebase, architecture, and development decisions.

## 🏗 Project Overview

### Purpose
A real-time collaborative pixel art application where multiple users can simultaneously paint on a shared 32x32 canvas. Users see each other's cursors and changes in real-time, creating a live collaborative drawing experience.

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Real-time + Authentication)
- **Real-time**: Supabase Realtime (WebSockets) with polling fallback
- **Security**: Row Level Security (RLS) policies
- **CI/CD**: GitHub Actions for automated security auditing

## 🧠 Key Architecture Decisions

### Why Supabase Instead of CRDT?
Originally planned as a CRDT (Conflict-free Replicated Data Type) system, but pivoted to Supabase for:
- **Simplicity**: Centralized state management vs. complex distributed consensus
- **Security**: Built-in RLS and authentication
- **Reliability**: Professional backend infrastructure
- **Real-time**: WebSocket support with automatic fallbacks

### Why 32x32 Grid?
- **High detail**: 1024 pixels total (4x more than original 16x16)
- **Performance**: Small enough for real-time updates
- **Visual balance**: Detailed enough for art, simple enough for collaboration
- **Memory efficient**: Fits comfortably in browser memory

### Color System Evolution
1. **Database-driven**: Initially loaded 100+ colors from Supabase `colors` table
2. **Filtered/sorted**: Attempted algorithmic color curation (hue buckets, HSL filtering)
3. **SNES-inspired**: Tried retro gaming color palette  
4. **Minimal + personal**: Final design with 8 essential colors + user's unique color + native HTML color picker

## 📁 File Structure Analysis

### Core Files
- **`index.html`**: Minimal HTML structure, semantic layout
- **`main.js`**: ~900 lines, all application logic (no build system)
- **`style.css`**: Modern CSS with Grid, Flexbox, and animations
- **`supabase-config.js`**: Database connection configuration

### Scripts Directory
- **`audit-supabase.js`**: Security testing (RLS policies, data validation)
- **`diagnose-rls.js`**: Debugging tool for Row Level Security issues
- **`audit-table.sh`**: Docker-based database inspection
- **`fix-policies.sh`**: Policy management and cleanup
- **`update-policies.sh`**: Grid size migration tools

### Key Code Patterns

#### State Management
```javascript
// Global state variables (functional approach)
let currentRoom = null
let selectedColor = '#FF0000'
let pixelCache = new Map() // Local cache for performance
let connectedUsers = new Map() // User presence tracking
```

#### Real-time Architecture
```javascript
// Dual approach: Real-time + Polling fallback
subscription = supabase.channel(`room:${currentRoom}`)
  .on('postgres_changes', handleRealtimeChange)
  .on('presence', handlePresenceSync)

// Polling backup if WebSockets fail
pollingInterval = setInterval(syncWithServer, 2000)
```

#### Security-First Design
```javascript
// Client-side validation mirrors server RLS policies
if (x < 0 || x >= 32 || y < 0 || y >= 32) return
if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return
```

## 🔒 Security Implementation

### Multi-Layer Security
1. **Database Level**: RLS policies enforce grid bounds, color format, room validation
2. **Application Level**: Client-side validation prevents invalid requests
3. **Infrastructure Level**: Automated auditing catches policy failures

### Critical Security Considerations
- **Anonymous users**: Can read/write pixels but cannot delete
- **Input validation**: Strict bounds checking (x,y: 0-31, colors: hex format)
- **Room isolation**: Users can only see pixels in their current room
- **Rate limiting**: Cursor updates throttled to 20 FPS

### Common Security Issues
1. **Policy conflicts**: Multiple overlapping RLS policies with different rules
2. **Bounds checking**: Off-by-one errors in grid validation (use `< 32` not `<= 31`)
3. **SQL injection**: Color validation must be regex-based, not string matching

## 🎨 UI/UX Design Philosophy

### Minimalist Approach
- **Essential colors only**: 8 carefully chosen colors + user's personal color
- **Compact layout**: Colors hidden until connected, horizontal arrangement
- **Native controls**: HTML color picker instead of custom widgets
- **Visual hierarchy**: Status bar → colors → canvas → user list

### User Experience Flow
1. **Identity generation**: Random user ID + HSL color for cursor/painting
2. **Room connection**: Enter room name, colors appear, start painting
3. **Visual feedback**: Optimistic updates, pixel animations, cursor tracking
4. **Collaboration**: See others paint in real-time with their colors

### Responsive Design
- **Desktop**: 15px pixels (32x32 = 480px canvas), full feature set
- **Mobile**: 10px pixels (32x32 = 320px canvas), touch-friendly controls
- **Accessibility**: High contrast, semantic HTML, keyboard navigation

## 🚀 Performance Optimizations

### Real-time Efficiency
- **Cursor throttling**: Max 20 updates/second (50ms intervals)
- **Presence optimization**: Only send cursors when others are present
- **Local caching**: `Map()` for O(1) pixel lookups
- **Selective updates**: Only re-render changed pixels

### Memory Management
- **Cache cleanup**: Clear on room disconnect
- **Event listeners**: Proper cleanup to prevent memory leaks
- **DOM efficiency**: Minimal DOM manipulations, CSS animations over JS

## 🔧 Development Patterns

### Error Handling
```javascript
// Graceful degradation pattern
try {
  // Attempt WebSocket real-time
  await supabase.channel().subscribe()
} catch (error) {
  // Fall back to polling
  startPolling()
}
```

### Debug Utilities
```javascript
// Exposed debug object for development
window.pixelDebug = {
  getRoom, getPixels, testSync, 
  checkRealtime, testLatency, testCORS
}
```

### Code Organization
- **Single-file architecture**: No build system, vanilla JS
- **Functional approach**: Pure functions where possible
- **Event-driven**: DOM events, WebSocket events, polling intervals

## 📋 Common Development Tasks

### Adding New Features
1. **Update database schema** if needed (migrations)
2. **Add RLS policies** for new data access patterns
3. **Update security audit** scripts to test new features
4. **Add debug utilities** for development/testing

### Debugging Real-time Issues
1. **Check WebSocket status**: `pixelDebug.checkRealtime()`
2. **Test network latency**: `pixelDebug.testLatency()`
3. **Inspect local cache**: `pixelDebug.getPixels()`
4. **Review server logs** in Supabase dashboard

### Security Testing
1. **Run audit script**: `npm run audit:security`
2. **Check policy conflicts**: `npm run audit:table`
3. **Fix policy issues**: `npm run fix:policies`
4. **Test edge cases**: Invalid coordinates, malformed colors, etc.

## 🐛 Known Issues & Limitations

### Technical Limitations
- **No authentication**: Anonymous-only (by design for simplicity)
- **No persistence**: Users lose their identity on refresh
- **Safari WebSockets**: May have connectivity issues
- **Mobile performance**: Cursor tracking less precise

### Potential Improvements
- **Undo/redo**: Local command history
- **Layers**: Multiple drawing layers
- **Export**: Save artwork as PNG/SVG
- **Rooms list**: Discover active collaborative sessions

## 🎯 Testing Strategy

### Automated Testing
- **Security audits**: Daily GitHub Actions runs
- **Policy validation**: Checks for RLS policy integrity
- **Data validation**: Tests grid bounds, color formats

### Manual Testing Checklist
- [ ] Real-time synchronization works across browsers
- [ ] User presence (cursors) updates correctly
- [ ] Security policies block invalid data
- [ ] Optimistic updates provide immediate feedback
- [ ] Graceful fallback to polling if WebSockets fail

## 📚 Learning Resources

### Supabase Concepts
- **Real-time subscriptions**: PostgreSQL logical replication
- **Row Level Security**: PostgreSQL security policies
- **Presence system**: Real-time user state sharing

### Web Technologies
- **CSS Grid**: Layout for pixel canvas
- **WebSockets**: Real-time communication
- **Canvas alternatives**: Using DOM elements instead of `<canvas>`

## 🔮 Future Considerations

### Scalability
- **Room sharding**: Distribute large rooms across servers
- **CDN caching**: Static assets and read-only data
- **Database optimization**: Indexes, query optimization

## 🚀 Deployment Architecture

### GitHub Pages Setup
- **Automated deployment**: GitHub Actions workflow on every push to main
- **Build process**: Vite optimizes and bundles the application
- **Static hosting**: Perfect for client-side apps with external backend (Supabase)
- **HTTPS support**: Required for Supabase WebSocket connections

### Build Configuration
- **vite.config.js**: Configures base path for GitHub Pages subdirectory serving
- **Production optimizations**: Minification, source maps, asset optimization
- **Environment handling**: Different base paths for development vs production

### Deployment Considerations
- **Supabase config**: anon keys are safe for client-side deployment
- **CORS settings**: Ensure Supabase allows requests from your GitHub Pages domain
- **WebSocket connections**: HTTPS required, automatically handled by GitHub Pages
- **Caching**: GitHub Pages provides CDN caching for static assets

### Features
- **User accounts**: Persistent identity and artwork saving
- **Templates**: Pre-made canvases to collaborate on
- **Animations**: Frame-by-frame pixel art animation
- **AI integration**: AI-assisted drawing suggestions

## 🔄 Standard Development Workflow

**IMPORTANT**: Always follow this workflow when making changes to the project:

1. **Make code changes** - Implement the requested feature/fix
2. **Update README.md** - Ensure setup instructions, features list, and examples are current
3. **Update CLAUDE.md** - Document any architectural changes, new patterns, or important decisions
4. **Commit changes** - Use descriptive commit messages with proper formatting
5. **Push to repository** - Make changes available to others

### Commit Message Template
```
Brief description of changes

## Changes Made
- Bullet point list of specific changes
- Include both code and documentation updates
- Mention any breaking changes or new requirements

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Never skip documentation updates** - They're crucial for project maintainability and future AI assistance.

---

This context should help any AI assistant understand the project's architecture, design decisions, and development patterns when working on future enhancements or debugging issues.