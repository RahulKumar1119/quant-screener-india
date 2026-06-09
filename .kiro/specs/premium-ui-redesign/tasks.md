# Implementation Plan:

## Overview

This plan transforms the Quant Screener India frontend into a premium fintech-grade experience through a layered approach: first establishing the Design System foundation (CSS tokens, keyframes, utilities), then applying it to each component. Tasks are ordered so that the foundational styling is in place before component-level updates begin.

## Tasks

- [x] 1. Create Design System Foundation in src/index.css — Add CSS custom properties on :root and .dark for color tokens (primary, accent, surface, surface-elevated, border, success, warning, danger as RGB triplets), add theme transition rules (250ms ease-out on background/border-color), add @layer components with .glass utility (backdrop-blur-12px, semi-transparent bg, 1px border, two-layer box-shadow for both light and dark modes), add @keyframes for shimmer (1.5s), fade-in, scale-in, pulse-glow, rotate-slow (8s), add .animate-fade-in/.animate-scale-in/.animate-shimmer/.animate-pulse-glow utility classes, add stagger-1 through stagger-10 utility classes (60ms increments), add @media prefers-reduced-motion:reduce rule setting all animation/transition durations to 0.01ms, add .skeleton base class with gradient shimmer background
  - [x] 1.1 Add CSS custom properties on :root for primary, accent, surface, surface-elevated, border, success, warning, danger color tokens as RGB triplets
  - [x] 1.2 Add CSS custom properties on .dark selector with dark-mode color token values using slate-900 base palette
  - [x] 1.3 Add theme transition rule for elements with token-based backgrounds: transition background-color 250ms ease-out and border-color 250ms ease-out
  - [x] 1.4 Add @layer components with .glass utility class implementing backdrop-filter blur(12px), semi-transparent rgba bg, 1px border, and two-layer box-shadow for light mode
  - [x] 1.5 Add .dark .glass override with dark-mode rgba values (rgba(15,23,42,0.7) bg, rgba(255,255,255,0.08) border, darker shadows)
  - [x] 1.6 Add @keyframes shimmer animation (background-position -200% to 200%, for use with 1.5s linear infinite)
  - [x] 1.7 Add @keyframes fade-in (opacity 0 + translateY(8px) to opacity 1 + translateY(0)), scale-in, pulse-glow, and rotate-slow (360deg)
  - [x] 1.8 Add .animate-fade-in, .animate-scale-in, .animate-shimmer, .animate-pulse-glow utility classes applying respective keyframes
  - [x] 1.9 Add stagger utility classes .stagger-1 through .stagger-10 with animation-delay increments of 60ms
  - [x] 1.10 Add @media (prefers-reduced-motion: reduce) rule that sets animation-duration and transition-duration to 0.01ms for all elements
  - [x] 1.11 Add .skeleton base class with theme-aware gradient shimmer background (gray-200/gray-100 for light, slate-700/slate-600 for dark)
- [ ] 2. Create Tailwind Configuration Extension — Create tailwind.config.js extending theme.colors with token-based colors (primary, accent, surface, etc. using rgb(var(--color-X) / alpha-value)), extend theme.animation with shimmer/fade-in/scale-in/pulse-glow/rotate-slow, extend transitionTimingFunction with ease-premium cubic-bezier, verify build succeeds
  - [~] 2.1 Create tailwind.config.js with content paths pointing to src/**/*.{tsx,ts}
  - [~] 2.2 Extend theme.colors with token-based colors referencing CSS custom properties using rgb(var(--color-X) / alpha-value) syntax
  - [~] 2.3 Extend theme.animation with shimmer, fade-in, scale-in, pulse-glow, rotate-slow referencing keyframes from index.css
  - [~] 2.4 Extend theme.transitionTimingFunction with ease-premium cubic-bezier(0.4, 0, 0.2, 1)
  - [~] 2.5 Run npm run build and verify successful compilation with no errors
- [ ] 3. Update App Shell and Base Theme Colors — Replace bg-white/dark:bg-gray-900 and text-gray-900/dark:text-gray-100 in App.tsx with design-system token-based classes, verify both themes render correctly
  - [~] 3.1 Replace bg-white dark:bg-gray-900 with bg-surface (using new token) on the root div
  - [~] 3.2 Replace text-gray-900 dark:text-gray-100 with token-aware text color classes
  - [~] 3.3 Verify both dark and light modes render correctly with the new base colors
- [ ] 4. Redesign NavigationHeader — Apply gradient background (from-slate-900 via-slate-800 to-slate-900 dark, from-white via-slate-50 to-white light), replace plain border-b with gradient bottom border, add scroll listener for elevated shadow/backdrop-blur state, apply gradient text to logo (from-indigo-500 to-violet-500 bg-clip-text text-transparent), add hover:scale-105 transition-transform duration-150 to interactive elements
  - [~] 4.1 Replace solid background with gradient: bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 (dark) and from-white via-slate-50 to-white (light)
  - [~] 4.2 Replace border-b with gradient bottom border using pseudo-element or border-image with accent colors
  - [~] 4.3 Add scroll event listener in useEffect that toggles shadow-xl and backdrop-blur-xl classes when scrollY > 0
  - [~] 4.4 Apply gradient text fill to logo: bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent
  - [~] 4.5 Add hover:scale-105 transition-transform duration-150 ease-out to mobile search button and ThemeToggle button
  - [~] 4.6 Verify header renders correctly in both themes and scrolled/non-scrolled states
- [ ] 5. Enhance TickerSearchBar — Add focus-within width expansion (max-w-md to max-w-lg, 200ms ease-out), add accent ring glow on focus (ring-2 ring-indigo-500/50), apply .glass class to dropdown, add dropdown enter/exit opacity+translateY transitions (150ms), update highlighted item with border-l-2 border-indigo-500 and gradient background
  - [~] 5.1 Add focus-within width expansion on container div with transition-all duration-200 ease-out
  - [~] 5.2 Add accent ring glow on focus: focus-within:ring-2 focus-within:ring-indigo-500/50
  - [~] 5.3 Apply .glass class to the dropdown ul element replacing current border/bg classes
  - [~] 5.4 Add dropdown enter/exit transitions with opacity and translateY using transition-[opacity,transform] duration-150
  - [~] 5.5 Update highlighted item styling to border-l-2 border-indigo-500 bg-gradient-to-r from-indigo-500/10 to-transparent
  - [~] 5.6 Verify keyboard navigation, dropdown appearance, and focus effects work correctly
- [ ] 6. Apply Micro-Interactions to ProfileCardGrid — Replace card classes with .glass + hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200, add border-t-2 with dynamic color (green-500/red-500/slate-300) based on metric status, add animate-fade-in with stagger delay per card index (index*60ms), update badges with gradient backgrounds and matching glow shadows
  - [~] 6.1 Replace card container classes with .glass utility plus hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200
  - [~] 6.2 Add border-t-2 to each card with dynamic color based on metric status (green-500 favorable, red-500 unfavorable, slate-300 neutral)
  - [~] 6.3 Add animate-fade-in class to each card with inline style animationDelay based on card index times 60ms
  - [~] 6.4 Update badge styling to use gradient backgrounds with matching semantic glow shadows
  - [~] 6.5 Verify cards animate on page load, hover lift works, and colors match metric values
- [ ] 7. Upgrade Intel Engine Dashboard, TFT Gauge, and XGBoost Badge — Apply .glass to both dashboard panels, add shadow-inner to chart panel, add gradient divider between ML panels (h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent), animate TFT gauge score from 0 to target over 800ms using requestAnimationFrame, add animate-pulse-glow to XGBoost badge with dynamic rating color
  - [~] 7.1 Apply .glass class to both chart panel and ML scoring panel divs in IntelEngineDashboard
  - [~] 7.2 Add shadow-inner to the chart panel container for recessed display effect
  - [~] 7.3 Add gradient divider div between TFTScoreGauge and XGBoostRatingBadge
  - [~] 7.4 In TFTScoreGauge, animate displayed score from 0 to target using useState + useEffect with requestAnimationFrame over 800ms with ease-out
  - [~] 7.5 In XGBoostRatingBadge, add animate-pulse-glow class to rating badge with dynamic shadow color matching rating
  - [~] 7.6 Verify gauge animates on render, badge pulses, and divider displays correctly
- [ ] 8. Apply Premium Styling to PriceChart — Read CSS custom property values via getComputedStyle for chart background/grid/text colors instead of hardcoded hex, add animate-fade-in to chart container, update legend items with colored dots and hover:animate-pulse-glow, add rounded-xl overflow-hidden to container
  - [~] 8.1 Read CSS custom property values using getComputedStyle for chart layout.background, grid colors, and textColor
  - [~] 8.2 Add animate-fade-in class to the chart container wrapper div
  - [~] 8.3 Update legend items to include small colored dot indicators with hover:animate-pulse-glow effect
  - [~] 8.4 Add overflow-hidden rounded-xl to chart container for cleaner edge clipping
  - [~] 8.5 Verify chart renders correctly in both themes and fades in on mount
- [ ] 9. Apply Premium Treatment to FinancialTable — Replace outer container with .glass, update thead to gradient background (from-slate-100 to-slate-50 / from-slate-800 to-slate-900), add row hover highlight (hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors duration-150), add transition-transform to sort indicators, add animate-fade-in to tbody rows with 40ms stagger delay
  - [~] 9.1 Replace outer container border/bg classes with .glass utility
  - [~] 9.2 Update thead background to gradient: bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900
  - [~] 9.3 Add row hover effect: hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors duration-150
  - [~] 9.4 Add transition-transform duration-200 to sort indicator spans
  - [~] 9.5 Add animate-fade-in to each tbody tr with inline animationDelay of index times 40ms
  - [~] 9.6 Verify table glassmorphism, row hover highlights, and sort animation work correctly
- [ ] 10. Refine GemmaSummaryCard — Replace solid border with gradient border (wrapper div with bg-gradient-to-r from-indigo-500 to-violet-500 p-[2px] rounded-xl), add animate-rotate-slow to sparkle icon, implement typewriter text (split words with sequential fade-in delays), add diagonal shimmer background, show .skeleton loader when summary is empty
  - [~] 10.1 Replace solid border with gradient border using wrapper div approach (bg-gradient-to-r from-indigo-500 to-violet-500 p-[2px] rounded-xl inner bg)
  - [~] 10.2 Add animate-[rotate-slow_8s_linear_infinite] class to the sparkle SVG icon
  - [~] 10.3 Implement typewriter text effect by splitting summary into words with sequential animate-fade-in delays
  - [~] 10.4 Add shimmer background: bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent bg-[length:200%_100%] animate-shimmer
  - [~] 10.5 Render .skeleton loader div when summary is empty, matching card content dimensions
  - [~] 10.6 Verify rotating icon, word-by-word text reveal, shimmer, and skeleton states work
- [ ] 11. Enhance CustomScreenerPage Layout — Wrap QueryInputArea in .glass div, wrap HelperPanel in .glass div with additional bg-indigo-500/5 tint, update heading with border-l-4 border-indigo-500 pl-3 and gradient text, replace loading spinner with skeleton grid matching results table, add transition-opacity duration-200 for crossfade
  - [~] 11.1 Wrap QueryInputArea container in a .glass styled div
  - [~] 11.2 Wrap HelperPanel container in a .glass div with additional bg-indigo-500/5 dark:bg-indigo-400/5 tint
  - [~] 11.3 Update h1 heading with border-l-4 border-indigo-500 pl-3 and gradient text (from-indigo-600 to-violet-600 bg-clip-text text-transparent)
  - [~] 11.4 Replace current loading spinner with skeleton grid using .skeleton class matching ScreenerResultsGrid shape
  - [~] 11.5 Add transition-opacity duration-200 to content wrapper for crossfade between loading and loaded states
  - [~] 11.6 Verify glassmorphism, distinct helper panel tint, and skeleton loading display correctly
- [ ] 12. Enhance ScreenerResultsGrid — Replace container with .glass, update row hover to gradient reveal (hover:bg-gradient-to-r from-indigo-500/5 to-transparent), add glow shadow to RatingBadge matching badge color, add hover:scale-105 and focus:ring to pagination buttons, add animate-fade-in to result rows with 30ms stagger
  - [~] 12.1 Replace outer container border/bg with .glass utility class
  - [~] 12.2 Update row hover to gradient reveal: hover:bg-gradient-to-r hover:from-indigo-500/5 hover:to-transparent transition-all duration-200
  - [~] 12.3 Add glow shadow to RatingBadge with dynamic color matching badge semantics (shadow-green-500/20 for BUY etc)
  - [~] 12.4 Add hover:scale-105 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-150 to pagination buttons
  - [~] 12.5 Add animate-fade-in to each result tr with inline animationDelay of index times 30ms
  - [~] 12.6 Verify results table glassmorphism, row hover gradient, badge glow, and pagination effects
- [ ] 13. Upgrade AnalyticsPage Skeleton and Transitions — Replace skeleton div classes (bg-gray-200 dark:bg-gray-700) with .skeleton utility class including shimmer animation, ensure skeleton shapes match content dimensions, add transition-opacity duration-300 wrapper for crossfade from skeleton to content
  - [~] 13.1 Replace bg-gray-200 dark:bg-gray-700 skeleton divs with .skeleton utility class that includes shimmer animation
  - [~] 13.2 Ensure skeleton shapes match approximate dimensions of replaced content (profile cards, chart, table, summary)
  - [~] 13.3 Add transition-opacity duration-300 wrapper around content area for crossfade from skeleton to loaded state
  - [~] 13.4 Verify skeleton shimmer animates correctly in both themes and content crossfades in
- [ ] 14. Enhance ThemeToggle — Add hover:scale-110 active:scale-95 transition-all duration-200 to toggle button, add subtle hover background glow (hover:bg-indigo-500/10 dark:hover:bg-indigo-400/10), verify toggle animates and theme switch triggers token transitions
  - [~] 14.1 Add hover:scale-110 active:scale-95 transition-all duration-200 to the toggle button
  - [~] 14.2 Add subtle background glow on hover: hover:bg-indigo-500/10 dark:hover:bg-indigo-400/10
  - [~] 14.3 Verify toggle animates smoothly and theme switch triggers color token transitions
- [ ] 15. Add Responsive Mobile Optimizations — Add @media (max-width: 767px) override for .glass reducing backdrop-blur to 8px and simplifying to single-layer shadow, add mobile rule ensuring all button/a/input elements have min-height and min-width of 44px, verify navigation effects at reduced intensity on mobile, verify existing responsive layouts remain correct
  - [~] 15.1 Add @media (max-width: 767px) override for .glass that reduces backdrop-blur to 8px and uses single-layer shadow
  - [~] 15.2 Add global mobile rule ensuring all button, a, and input elements have min-height 44px and min-width 44px
  - [~] 15.3 Verify Navigation_Header gradient and glow effects remain active at reduced intensity on mobile
  - [~] 15.4 Verify ProfileCardGrid displays 2 columns on mobile with maintained hover effects
  - [~] 15.5 Verify IntelEngineDashboard stacks vertically on mobile
  - [~] 15.6 Run build and verify no CSS issues at mobile breakpoints
- [ ] 16. Final Integration Verification — Run npm run build for successful production build, run npm run test to verify existing tests pass, manually verify dark/light mode toggle with smooth transitions, verify stagger animations do not conflict across page navigation, verify prefers-reduced-motion disables all animations
  - [~] 16.1 Run npm run build and verify successful production build with no errors
  - [~] 16.2 Run npm run test to verify existing tests still pass
  - [~] 16.3 Verify dark mode toggle works with smooth transitions across all components
  - [~] 16.4 Verify staggered animations do not stack or conflict when navigating between pages
  - [~] 16.5 Verify prefers-reduced-motion disables all animations via browser DevTools emulation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "6.1", "6.2", "6.3", "6.4", "6.5", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "8.1", "8.2", "8.3", "8.4", "8.5", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "13.1", "13.2", "13.3", "13.4", "14.1", "14.2", "14.3", "15.1", "15.2", "15.3", "15.4", "15.5", "15.6"] },
    { "id": 4, "tasks": ["16.1", "16.2", "16.3", "16.4", "16.5"] }
  ]
}
```

## Notes

- Tasks 1-3 must be completed sequentially as each builds on the prior foundation
- Tasks 4-15 can be executed in parallel after Task 3 is complete (except Task 15 which only depends on Task 1)
- Task 16 must be last as it verifies the complete integration
- No new npm dependencies are required — all effects use Tailwind CSS and CSS custom properties
- The data layer, API contracts, and routing are untouched by this redesign
