# Frontend Specifications

## Architecture

React 19 SPA built with Vite 6, TypeScript, and Tailwind CSS 4. Code-split by page with lazy loading.

### Tech Stack
| Concern | Library |
|---------|---------|
| Framework | React 19 |
| Language | TypeScript (strict) |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (dark theme) |
| State | Zustand 5 |
| Routing | React Router 7 |
| Animations | Framer Motion 12 |
| Charts | Recharts 2 |
| Map | Leaflet 1.9 + MarkerCluster + Heatmap |
| Icons | Lucide React |
| Fonts | Inter (body), JetBrains Mono (data), Cinzel (display/RPG titles) |

## File Structure

```
frontend/src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router + auth init + layout shell
├── api/
│   ├── client.ts               # authFetch with auto JWT refresh
│   ├── hooks.ts                # Data fetching hooks (useAPI pattern)
│   └── types.ts                # TypeScript interfaces for all API responses
├── stores/
│   ├── authStore.ts            # Zustand: token, user, isAuthenticated
│   ├── mapStore.ts             # Zustand: viewMode, filters, layers
│   └── uiStore.ts              # Zustand: modals, sidebar, toasts
├── lib/
│   ├── xp.ts                   # Level/rank calculations, rank titles + flavor text
│   ├── badges.ts               # Tier styles (Common→Mythic), category labels
│   └── format.ts               # Number/date formatting, encryption colors
├── styles/
│   └── globals.css             # Tailwind theme tokens, RPG animations, Leaflet overrides
├── components/
│   ├── layout/
│   │   ├── HUD.tsx             # Game-style header with nav, mini XP, profile
│   │   └── Sidebar.tsx         # Map sidebar: stats, filters, search, top SSIDs
│   ├── rpg/
│   │   ├── XPBar.tsx           # Animated XP progress bar with shimmer
│   │   ├── LevelRing.tsx       # SVG circular progress with avatar/level
│   │   ├── BadgeCard.tsx       # Tier-styled badge with glow, progress, hover
│   │   └── AchievementToast.tsx # Toast notifications for achievements
│   └── ui/
│       ├── Modal.tsx           # Generic animated modal
│       ├── DataTable.tsx       # Paginated table with sticky headers
│       ├── LoginModal.tsx      # GitHub OAuth + ToS acceptance checkbox
│       └── UploadModal.tsx     # Drag-drop upload + SSE progress + results
└── pages/
    ├── MapPage.tsx             # Leaflet map + sidebar + controls
    ├── ArmoryPage.tsx          # BT + Cell tables with tabs
    ├── LeaderboardPage.tsx     # Arena rankings with podium
    ├── StatsPage.tsx           # Global stats with Recharts
    ├── ProfilePage.tsx         # Public player profile
    ├── MyQuarters.tsx          # Personal hub (overview, badges, uploads, settings)
    └── TermsPage.tsx           # Terms of Service
```

## Design System

### Color Palette (Dark Theme)
```
Background:     void #0a0a0f, panel #12121a, surface #1a1a28
Borders:        #2a2a3e (subtle), #3d3d5c (glow)
Text:           primary #e2e2f0, secondary #8888a8, muted #555570
Accents:        xp #00ff88, wifi #00d4ff, bt #6366f1, cell #f59e0b
Danger:         #ef4444
Tiers:          rare #a855f7, legendary #fbbf24, mythic #ec4899
```

### Encryption Colors
- WPA3: `#00ff88` (green)
- WPA2: `#00d4ff` (cyan)
- WPA: `#f59e0b` (amber)
- WEP: `#ef4444` (red)
- Open: `#6b7280` (gray)

### RPG Animations
- `xp-shimmer`: Gradient slide on XP bars
- `glow-pulse`: Breathing opacity for badges
- `badge-float`: Vertical drift on hover
- `ring-fill`: SVG stroke-dashoffset for level ring
- `level-up`: Scale pulse on level gain
- `text-glow`: Text shadow pulse for XP gains

### Responsive Breakpoints
- Mobile (<768px): Hamburger menu, slide-in sidebar, stacked layouts, hidden podium
- Tablet (768-1024px): Compact nav labels, 2-col grids
- Desktop (>1024px): Full sidebar, 4-col grids, podium visible

## Code Splitting

Vite produces ~19 chunks:
- `vendor` (React/Router): 48KB gzip
- `charts` (Recharts): 109KB gzip — lazy, only on Stats page
- `map` (Leaflet): 43KB gzip — lazy, only on Map page
- `motion` (Framer): 42KB gzip — lazy
- `index` (app core): 67KB gzip
- Per-page chunks: 1-16KB gzip each

## Security

- All user-generated content (SSIDs, BSSIDs, device names) is HTML-escaped in map popups
- Badge SVG content sanitized (strips scripts, event handlers, `javascript:` URIs)
- JWT auto-refresh 30s before expiry
- ToS acceptance required before login (checkbox + link to /terms)
