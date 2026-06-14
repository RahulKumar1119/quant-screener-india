# Design Document: Premium UI/UX Redesign

## Overview

This design transforms the Quant Screener India platform from a functional but plain interface into a premium fintech-grade experience. The approach introduces a Design System layer (CSS custom properties + Tailwind utilities) that all components consume, ensuring visual consistency. No new dependencies are added — the redesign leverages Tailwind CSS capabilities (backdrop-blur, gradients, animations) and the existing charting libraries.

## Architecture

### Design System Foundation

The redesign is structured as a layered system:

```
┌─────────────────────────────────────────────────┐
│            CSS Custom Properties Layer           │
│  (Color tokens, timing, spacing on :root/.dark) │
├─────────────────────────────────────────────────┤
│           Tailwind Utility Extensions            │
│  (Custom classes: glass, shimmer, stagger, etc) │
├─────────────────────────────────────────────────┤
│            Component Styling Layer               │
│  (Per-component Tailwind class compositions)    │
└─────────────────────────────────────────────────┘
```

**File changes:**
- `src/index.css` — Extended with CSS custom properties, keyframe animations, and `@layer components` definitions
- `tailwind.config.js` (or inline Rsbuild config) — Extended with custom colors referencing CSS variables, animation utilities, and backdrop-blur values
- Each component file — Updated Tailwind classes (no structural/logic changes)

### Color Token System

Tokens are defined as CSS custom properties and consumed via Tailwind's `theme.extend.colors`:

```css
:root {
  --color-primary: 99 102 241;       /* indigo-500 */
  --color-accent: 139 92 246;        /* violet-500 */
  --color-surface: 248 250 252;      /* slate-50 */
  --color-surface-elevated: 255 255 255;
  --color-border: 226 232 240;       /* slate-200 */
  --color-success: 34 197 94;
  --color-warning: 245 158 11;
  --color-danger: 239 68 68;
}

.dark {
  --color-primary: 129 140 248;      /* indigo-400 */
  --color-accent: 167 139 250;      /* violet-400 */
  --color-surface: 15 23 42;        /* slate-900 */
  --color-surface-elevated: 30 41 59; /* slate-800 */
  --color-border: 51 65 85;         /* slate-600 */
  --color-success: 74 222 128;
  --color-warning: 251 191 36;
  --color-danger: 248 113 113;
}
```

### Glassmorphism Utility

Defined in `@layer components` inside `src/index.css`:

```css
@layer components {
  .glass {
    @apply backdrop-blur-[12px] border shadow-lg shadow-black/5;
    background: rgba(255, 255, 255, 0.75);
    border-color: rgba(0, 0, 0, 0.06);
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.05),
      0 10px 15px -3px rgba(0, 0, 0, 0.03);
  }
  .dark .glass {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.3),
      0 10px 15px -3px rgba(0, 0, 0, 0.2);
  }
}
```

### Animation Keyframes

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 currentColor; }
  50% { box-shadow: 0 0 8px 2px currentColor; }
}

@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Stagger Utilities

Generated via Tailwind plugin or inline CSS:

```css
.stagger-1 { animation-delay: 60ms; }
.stagger-2 { animation-delay: 120ms; }
.stagger-3 { animation-delay: 180ms; }
/* ... up to stagger-10 */
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Data Models

This redesign does not introduce new data models. All existing TypeScript interfaces (`TickerProfile`, `HistoricalData`, `TFTOutput`, `XGBoostOutput`, `QuarterlyFinancial`, `TickerSummary`) remain unchanged. The only new "data" is the Design System token definitions which are CSS custom properties, not TypeScript types.

## Components and Interfaces

### Design System Layer (src/index.css)

**Inputs:** None (pure CSS definitions)  
**Outputs:** CSS custom properties, utility classes, keyframe animations available globally

Key exports:
- CSS custom properties: `--color-primary`, `--color-accent`, `--color-surface`, `--color-surface-elevated`, `--color-border`, `--color-success`, `--color-warning`, `--color-danger`
- Utility classes: `.glass`, `.animate-fade-in`, `.animate-scale-in`, `.animate-shimmer`, `.animate-pulse-glow`, `.stagger-1` through `.stagger-10`
- Keyframe animations: `shimmer`, `fade-in`, `scale-in`, `pulse-glow`, `rotate-slow`

### NavigationHeader (updated)

**Props:** No change  
**Behavior change:** Adds scroll event listener to toggle elevated state. Uses gradient background and gradient logo text.

### TickerSearchBar (updated)

**Props:** No change  
**Behavior change:** Focus triggers width expansion. Dropdown uses glassmorphism and fade transition. Highlighted item uses accent border.

### ProfileCardGrid (updated)

**Props:** No change  
**Behavior change:** Cards use glass styling with hover lift. Staggered entrance animation on mount. Top-border color reflects metric status.

### IntelEngineDashboard (updated)

**Props:** No change  
**Behavior change:** Panels use glass styling. Gradient divider between ML panels.

### TFTScoreGauge (updated)

**Props:** No change  
**Behavior change:** Score animates from 0 to target value on render using controlled state with requestAnimationFrame.

### XGBoostRatingBadge (updated)

**Props:** No change  
**Behavior change:** Badge has pulsing glow animation matching rating color.

### PriceChart (updated)

**Props:** No change  
**Behavior change:** Reads CSS custom property values for chart theming. Container fades in on mount.

### FinancialTable (updated)

**Props:** No change  
**Behavior change:** Glass container, gradient header, hover highlights, staggered row entrance.

### GemmaSummaryCard (updated)

**Props:** No change  
**Behavior change:** Gradient border, rotating icon, typewriter text reveal, shimmer background. Shows skeleton when summary is empty.

### ScreenerResultsGrid (updated)

**Props:** No change  
**Behavior change:** Glass container, gradient hover reveal, badge glow, pagination hover effects, staggered rows.

### AnalyticsPage (updated)

**Props:** No change  
**Behavior change:** LoadingSkeleton uses shimmer animation. Content crossfades from skeleton.

## Error Handling

No new error states are introduced by this redesign. Existing error handling (ErrorBanner, loading states) receives visual enhancement only:
- Error banners maintain their semantic color coding but gain glassmorphism treatment
- Loading states are upgraded from basic `animate-pulse` to shimmer gradient skeleton loaders
- Fallback for `backdrop-filter` not supported: elements degrade to solid backgrounds (the semi-transparent rgba values still work without blur)

## Testing Strategy

Since this is a purely visual change with no business logic modifications:
- **Visual regression testing:** Manual comparison of before/after screenshots for each component in both themes
- **Accessibility testing:** Verify `prefers-reduced-motion` disables animations via browser DevTools emulation
- **Performance testing:** Lighthouse audit on mobile to confirm Performance score remains above 90
- **Cross-browser testing:** Verify `backdrop-filter` renders in Chrome, Firefox, Safari, Edge
- **Responsive testing:** Verify mobile breakpoint adjustments at 768px boundary

## Component Design Details

### NavigationHeader

- Background: `bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900` (dark) / `bg-gradient-to-r from-white via-slate-50 to-white` (light)
- Bottom border: replaced with `border-b border-gradient` using pseudo-element with accent gradient
- Scroll effect: JS scroll listener adds `shadow-xl backdrop-blur-lg` class when scrollY > 0
- Logo: `bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent`
- Interactive elements: `hover:scale-105 transition-transform duration-150 ease-out`

### TickerSearchBar

- Focus: `focus-within:w-[115%] transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-indigo-500/50`
- Dropdown: `.glass` class + enter/exit CSS transitions using `transition-[opacity,transform]`
- Highlighted item: `border-l-2 border-indigo-500 bg-gradient-to-r from-indigo-500/10 to-transparent`

### ProfileCardGrid

- Cards: `.glass` + `hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200`
- Top border: `border-t-2` with color dynamically set (green-500, red-500, or slate-300)
- Entrance: `animate-fade-in` with `stagger-N` class per card index
- Badges: `bg-gradient-to-r` with matching semantic colors + `shadow-sm shadow-green-500/20` (or red)

### IntelEngineDashboard

- Both panels: `.glass` class
- Chart panel: `shadow-inner` for recessed effect
- Divider: `<div class="h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />`
- TFT gauge: CSS transition on the Recharts Pie `startAngle` via controlled animation state (animate score from 0 to target over 800ms using `requestAnimationFrame` or CSS)
- XGBoost badge: `animate-pulse-glow` with `color` set to rating color

### PriceChart

- Container: `animate-fade-in` on mount
- Chart options: Read CSS variables for `layout.background`, `grid` colors, `textColor`
- Legend dots: Small circles with `hover:animate-pulse-glow`

### FinancialTable

- Outer container: `.glass`
- Header: `bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-850`
- Row hover: `hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors duration-150`
- Sort icons: `transition-transform duration-200` with rotation
- Row entrance: `animate-fade-in stagger-N`

### GemmaSummaryCard

- Border: Pseudo-element with `bg-gradient-to-r from-indigo-500 to-violet-500` as border (using padding trick or `border-image`)
- Icon: `animate-[rotate-slow_8s_linear_infinite]`
- Text: Words wrapped in spans with `animate-fade-in` and sequential delays (JS splits text)
- Background shimmer: `bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent bg-[length:200%_100%] animate-shimmer`
- Empty state: Skeleton with shimmer

### CustomScreenerPage

- Containers: `.glass` on query area and helper panel
- Helper panel: Slightly different bg tint `bg-indigo-500/5 dark:bg-indigo-400/5`
- Headings: `border-l-4 border-indigo-500 pl-3 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent`
- View transitions: `transition-opacity duration-200`

### ScreenerResultsGrid

- Container: `.glass`
- Row hover: `hover:bg-gradient-to-r hover:from-indigo-500/5 hover:to-transparent transition-all duration-200`
- Rating badges: existing colors + `shadow-sm shadow-[color]/20`
- Pagination: `hover:scale-105 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-150`
- Row entrance: `animate-fade-in stagger-N`

### Skeleton Loaders

- Base class: `bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-shimmer rounded-lg`
- Content swap: Parent wrapper with `transition-opacity duration-300` toggling between skeleton and content

### Mobile Responsive Adjustments

- At `<768px`: `.glass` reduces to `backdrop-blur-[8px]` and single-layer shadow via `@media (max-width: 767px)` override
- Touch targets: All buttons and interactive elements get `min-h-[44px] min-w-[44px]`
- ProfileCardGrid: Already has `grid-cols-2` at base, no change needed
- IntelEngineDashboard: Already stacks with `flex-col lg:flex-row`, no structural change

## Correctness Properties

### Property 1: Glassmorphism utility consistency

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

For all components using the `.glass` class, the computed styles include `backdrop-filter` containing `blur` and `background` containing `rgba` values, verifying the glassmorphism utility is correctly defined and applied in both themes.

### Property 2: Reduced motion compliance

**Validates: Requirements 13.3**

When `prefers-reduced-motion: reduce` is active, all elements have effective animation-duration near 0ms, ensuring accessibility compliance for motion-sensitive users.

### Property 3: Touch target sizing on mobile

**Validates: Requirements 14.5**

For all interactive elements (buttons, links, inputs) at viewport width below 768px, the rendered min-height and min-width are at least 44px, meeting accessibility touch target guidelines.

### Property 4: Color token coverage across themes

**Validates: Requirements 1.1, 1.4, 1.5**

For both `:root` and `.dark` selectors, all defined color token CSS custom properties resolve to valid RGB triplet values (three space-separated integers 0-255).

### Property 5: Theme transition smoothness

**Validates: Requirements 1.2**

When toggling between dark and light themes, all Color_Token-dependent surface elements have a `transition` property with duration between 200ms and 300ms applied.

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/index.css` | Major | Add CSS custom properties, keyframes, glassmorphism layer, stagger utilities, reduced motion |
| `tailwind.config.js` (new) | Create | Tailwind config extending theme with custom colors, animations, utilities |
| `src/components/NavigationHeader.tsx` | Moderate | Update classes for gradient bg, glow border, scroll listener, gradient logo |
| `src/components/TickerSearchBar.tsx` | Moderate | Focus expansion, dropdown transitions, glassmorphism dropdown, highlighted styling |
| `src/components/ProfileCardGrid.tsx` | Moderate | Glass cards, hover lift, stagger entrance, gradient badges, top-border accent |
| `src/components/IntelEngineDashboard.tsx` | Light | Glass panels, inner shadow, gradient divider |
| `src/components/TFTScoreGauge.tsx` | Moderate | Animated gauge fill from 0 to target |
| `src/components/XGBoostRatingBadge.tsx` | Light | Pulsing glow animation on badge |
| `src/components/PriceChart.tsx` | Moderate | Read theme tokens, fade-in container, legend styling |
| `src/components/FinancialTable.tsx` | Moderate | Glass container, gradient header, row hover, stagger rows |
| `src/components/GemmaSummaryCard.tsx` | Moderate | Gradient border, rotating icon, typewriter text, shimmer bg |
| `src/components/CustomScreenerPage.tsx` | Light | Glass containers, accent headings, helper panel tint |
| `src/components/ScreenerResultsGrid.tsx` | Moderate | Glass container, gradient row hover, badge glow, pagination effects |
| `src/components/AnalyticsPage.tsx` | Light | Update skeleton loader to use shimmer, crossfade transitions |
| `src/components/ThemeToggle.tsx` | Light | Transition styling on toggle button |
| `src/App.tsx` | Light | Update base surface colors to use new token system |

## Constraints and Non-Goals

- **No new npm dependencies** — All effects achieved with Tailwind CSS, CSS custom properties, and existing libraries
- **No data layer changes** — API contracts, hooks, and state management remain untouched
- **No routing changes** — Same page structure and navigation flow
- **Performance budget** — Animations must not degrade Lighthouse Performance score below 90 on mobile
- **Browser support** — `backdrop-filter` requires Safari 9+, Chrome 76+, Firefox 103+ (all modern browsers)
