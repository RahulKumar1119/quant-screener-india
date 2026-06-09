# Requirements Document

## Introduction

Premium UI/UX Redesign of the Quant Screener India platform. This spec covers a complete visual overhaul of the existing React 19 SPA to achieve a premium fintech-grade aesthetic. The redesign targets visual polish (colors, gradients, glassmorphism), layout density (dashboard-style grids), interactivity (animations, micro-interactions, skeleton loaders), and an overall premium look and feel. The data layer, API contracts, and routing remain unchanged — this is a purely frontend visual and UX transformation.

## Glossary

- **Design_System**: The unified set of Tailwind CSS utility classes, CSS custom properties, and shared component primitives that define the visual language of the application
- **Glassmorphism_Layer**: A semi-transparent backdrop-blur container with subtle border and shadow used for cards and panels to create depth
- **Skeleton_Loader**: An animated placeholder element matching the shape of content that displays during data fetching
- **Micro_Interaction**: A small, purposeful animation triggered by user action (hover, click, focus) that provides visual feedback
- **Theme_Engine**: The system responsible for managing and applying dark and light mode color tokens across the application
- **Navigation_Header**: The sticky top bar containing logo, search, and theme toggle
- **Profile_Card_Grid**: The grid of metric cards showing market cap, PE, ROE, ROCE, and dividend yield
- **Intel_Engine_Dashboard**: The combined chart and ML-scoring panel section
- **Price_Chart**: The TradingView Lightweight Charts component displaying historical prices and LSTM projections
- **TFT_Score_Gauge**: The semi-circle Recharts gauge showing TFT macro resilience score
- **XGBoost_Rating_Badge**: The badge component displaying the XGBoost AI rating
- **Financial_Table**: The TanStack Table component showing quarterly financials
- **Gemma_Summary_Card**: The AI-generated analysis card
- **Custom_Screener_Page**: The page with query input, helper panel, and results grid
- **Screener_Results_Grid**: The sortable, paginated table of screener results
- **Color_Token**: A CSS custom property defining a color value that adapts between dark and light themes
- **Transition_Curve**: A CSS easing function (cubic-bezier) used for animations

## Requirements

### Requirement 1: Premium Color System and Theming

**User Story:** As a user, I want the application to use a rich, cohesive color palette with subtle gradients and accent colors, so that it looks premium and polished like a Bloomberg or Zerodha terminal.

#### Acceptance Criteria

1. THE Design_System SHALL define a set of Color_Tokens as CSS custom properties on the `:root` and `.dark` selectors covering primary, secondary, accent, surface, and semantic (success, warning, danger) color families
2. WHEN the Theme_Engine switches between dark and light mode, THE Design_System SHALL update all Color_Tokens with smooth opacity transitions lasting between 200ms and 300ms
3. THE Design_System SHALL use gradient backgrounds on key surfaces including the Navigation_Header and primary action buttons using the defined accent color family
4. WHILE in dark mode, THE Design_System SHALL apply a deep slate-blue base palette (slate-900 to slate-950 range) with cool-toned accent highlights rather than plain gray backgrounds
5. WHILE in light mode, THE Design_System SHALL apply warm off-white surfaces with subtle blue-tinted shadows to create depth

### Requirement 2: Glassmorphism Card Containers

**User Story:** As a user, I want card containers to have a frosted-glass aesthetic with depth, so that the interface feels layered and modern.

#### Acceptance Criteria

1. THE Design_System SHALL define a Glassmorphism_Layer class that applies a `backdrop-filter: blur(12px)` with a semi-transparent background (opacity between 0.6 and 0.85) and a 1px semi-transparent border
2. WHEN used in dark mode, THE Glassmorphism_Layer SHALL use a rgba(15, 23, 42, 0.7) background with a rgba(255, 255, 255, 0.08) border
3. WHEN used in light mode, THE Glassmorphism_Layer SHALL use a rgba(255, 255, 255, 0.75) background with a rgba(0, 0, 0, 0.06) border
4. THE Profile_Card_Grid, Intel_Engine_Dashboard panels, Financial_Table container, Gemma_Summary_Card, and Screener_Results_Grid container SHALL use the Glassmorphism_Layer styling
5. THE Glassmorphism_Layer SHALL include a box-shadow with at least two layers to create an elevated floating appearance

### Requirement 3: Navigation Header Redesign

**User Story:** As a user, I want the navigation header to feel sleek and contextually rich, so that I can navigate confidently with a premium feel.

#### Acceptance Criteria

1. THE Navigation_Header SHALL apply a gradient background that transitions from the primary accent color to a darker variant in dark mode, and from white to a subtle blue-tinted off-white in light mode
2. THE Navigation_Header SHALL include a subtle bottom glow or gradient border instead of a plain 1px border-bottom
3. WHEN the user scrolls down, THE Navigation_Header SHALL gain an elevated shadow and increased backdrop blur to visually separate from page content
4. THE Navigation_Header logo text SHALL use a gradient text fill using the accent color family
5. WHEN the user hovers over navigation links or icon buttons within the Navigation_Header, THE Navigation_Header SHALL apply a scale(1.05) transform with a 150ms ease-out transition

### Requirement 4: Enhanced Ticker Search Bar

**User Story:** As a user, I want the search bar to feel responsive and polished with smooth dropdown animations, so that finding tickers is a fluid experience.

#### Acceptance Criteria

1. WHEN the TickerSearchBar receives focus, THE TickerSearchBar SHALL expand its width by 10-15% with a 200ms ease-out transition and apply a colored ring glow using the accent color
2. WHEN the suggestion dropdown opens, THE TickerSearchBar dropdown SHALL animate in with a fade-in and translateY(-4px to 0) transition over 150ms
3. WHEN the suggestion dropdown closes, THE TickerSearchBar dropdown SHALL animate out with a fade-out and translateY(0 to -4px) transition over 100ms
4. WHILE a suggestion item is highlighted via keyboard or hover, THE TickerSearchBar SHALL apply a left accent-colored border and a subtle background gradient on the highlighted row
5. THE TickerSearchBar dropdown container SHALL use the Glassmorphism_Layer styling

### Requirement 5: Profile Card Grid with Micro-Interactions

**User Story:** As a user, I want metric cards to feel interactive and informative with visual cues for good/bad values, so that I can quickly scan key financial data.

#### Acceptance Criteria

1. WHEN the user hovers over a profile card in the Profile_Card_Grid, THE Profile_Card_Grid SHALL apply a translateY(-2px) lift and increase the box-shadow depth over a 200ms ease-out transition
2. THE Profile_Card_Grid cards SHALL display the metric value with a subtle color pulse animation on initial load to draw attention
3. THE Profile_Card_Grid favorable/unfavorable badges SHALL use a gradient background with a slight glow effect matching the semantic color (green for favorable, red for unfavorable)
4. WHEN a profile card enters the viewport on initial page load, THE Profile_Card_Grid SHALL stagger the card entrance with a fade-in and translateY(8px to 0) animation with 60ms delay between each card
5. THE Profile_Card_Grid cards SHALL include a subtle top-border colored accent that corresponds to the metric status (green, red, or neutral)

### Requirement 6: Intel Engine Dashboard Layout Upgrade

**User Story:** As a user, I want the chart and ML scoring panel to feel like a professional trading terminal, so that I can analyze data with confidence.

#### Acceptance Criteria

1. THE Intel_Engine_Dashboard SHALL apply Glassmorphism_Layer styling to both the chart panel and the ML scoring panel
2. THE Intel_Engine_Dashboard chart panel SHALL include a subtle inner shadow at the top to create a recessed display effect
3. THE Intel_Engine_Dashboard ML scoring panel (TFT_Score_Gauge and XGBoost_Rating_Badge) SHALL use a vertical layout with a divider line between items that uses a gradient fade from transparent to accent color to transparent
4. WHEN the TFT_Score_Gauge renders its score value, THE TFT_Score_Gauge SHALL animate the gauge fill from 0 to the target value over 800ms with an ease-out curve
5. WHEN the XGBoost_Rating_Badge renders, THE XGBoost_Rating_Badge SHALL apply a pulsing glow animation on the badge background that matches the rating color (green for BUY, red for SELL, amber for HOLD)

### Requirement 7: Price Chart Premium Styling

**User Story:** As a user, I want the price chart to feel alive and integrated with the premium design, so that technical data visualization matches the rest of the interface.

#### Acceptance Criteria

1. THE Price_Chart SHALL use the Design_System Color_Tokens for grid lines, axis labels, and crosshair colors to maintain visual consistency with the theme
2. THE Price_Chart historical line SHALL use a gradient stroke that fades from a brighter accent at recent points to a dimmer tone at older points
3. WHEN the Price_Chart first renders, THE Price_Chart container SHALL fade in with opacity 0 to 1 over 400ms
4. THE Price_Chart legend items SHALL include small colored dot indicators with a subtle pulse animation on hover
5. WHILE the LSTM projection series is displayed, THE Price_Chart SHALL apply a subtle glow effect to the projection line using a matching blue shadow

### Requirement 8: Financial Table Premium Treatment

**User Story:** As a user, I want the quarterly financials table to be easy to scan with clear visual hierarchy, so that I can quickly identify trends.

#### Acceptance Criteria

1. THE Financial_Table SHALL apply the Glassmorphism_Layer styling to its outer container
2. WHEN the user hovers over a table row, THE Financial_Table SHALL highlight the row with a subtle accent-tinted background transition over 150ms
3. THE Financial_Table header row SHALL use a gradient background from the surface color to a slightly darker variant
4. THE Financial_Table sort indicators SHALL animate rotation when sort direction changes with a 200ms transition
5. WHEN Financial_Table data loads for the first time, THE Financial_Table rows SHALL stagger in with a fade and slide animation with 40ms delay between each row

### Requirement 9: Gemma Summary Card Refinement

**User Story:** As a user, I want the AI summary card to stand out as a premium AI-powered feature, so that I recognize its value immediately.

#### Acceptance Criteria

1. THE Gemma_Summary_Card SHALL use a gradient border that smoothly transitions between two accent colors (indigo to violet) rather than a solid border
2. THE Gemma_Summary_Card icon SHALL animate with a continuous slow rotation (8 seconds per cycle) to indicate AI activity
3. WHEN the Gemma_Summary_Card content loads, THE Gemma_Summary_Card text SHALL appear with a typewriter-style fade-in effect where words become visible sequentially over 600ms
4. THE Gemma_Summary_Card SHALL include a subtle animated gradient shimmer in its background that moves diagonally at a slow pace
5. WHILE the summary text is empty or loading, THE Gemma_Summary_Card SHALL display a skeleton loader with an animated gradient sweep

### Requirement 10: Custom Screener Page Layout

**User Story:** As a user, I want the screener page to feel organized and spacious with clear visual zones, so that I can build queries and view results efficiently.

#### Acceptance Criteria

1. THE Custom_Screener_Page query area and helper panel containers SHALL use the Glassmorphism_Layer styling
2. WHEN the user submits a screener query, THE Custom_Screener_Page SHALL display a loading state with a skeleton grid matching the results table shape
3. THE Custom_Screener_Page section headings SHALL include a left accent border and gradient text styling
4. WHEN switching between the query area and results view, THE Custom_Screener_Page SHALL apply a smooth crossfade transition over 200ms
5. THE Custom_Screener_Page helper panel SHALL have a distinct visual treatment with a slightly different tint to differentiate it from the query input area

### Requirement 11: Screener Results Grid Enhancement

**User Story:** As a user, I want the results table to look clean and interactive with clear sorting feedback, so that I can analyze filtered stocks effortlessly.

#### Acceptance Criteria

1. THE Screener_Results_Grid container SHALL use the Glassmorphism_Layer styling
2. WHEN the user hovers over a result row, THE Screener_Results_Grid SHALL highlight the row with a left-to-right gradient reveal animation over 200ms
3. THE Screener_Results_Grid rating badges SHALL include a subtle glow matching the badge color
4. THE Screener_Results_Grid pagination buttons SHALL have a hover scale(1.05) effect and a focused ring glow using the accent color
5. WHEN results data loads, THE Screener_Results_Grid rows SHALL stagger in with a fade-in animation with 30ms delay between each row

### Requirement 12: Skeleton Loading States

**User Story:** As a user, I want loading states to feel smooth and predictable with animated placeholders, so that I know the app is working without seeing jarring content shifts.

#### Acceptance Criteria

1. THE Skeleton_Loader SHALL use an animated gradient sweep (shimmer) that moves from left to right continuously at 1.5 second intervals
2. WHILE in dark mode, THE Skeleton_Loader SHALL use slate-700 to slate-600 gradient colors for the shimmer
3. WHILE in light mode, THE Skeleton_Loader SHALL use gray-200 to gray-100 gradient colors for the shimmer
4. THE Skeleton_Loader shapes SHALL match the approximate dimensions and border-radius of the content they replace
5. WHEN content finishes loading, THE Skeleton_Loader SHALL crossfade to the actual content over 300ms rather than instantly swapping

### Requirement 13: Global Transition and Animation Defaults

**User Story:** As a user, I want all UI state changes to feel smooth rather than instant, so that the application feels fluid and polished.

#### Acceptance Criteria

1. THE Design_System SHALL define a default transition duration of 200ms with an ease-out Transition_Curve for all interactive elements (buttons, links, inputs)
2. THE Design_System SHALL define CSS keyframe animations for: fade-in, slide-up, scale-in, shimmer, and pulse-glow available as utility classes
3. WHEN the user prefers reduced motion (prefers-reduced-motion: reduce media query), THE Design_System SHALL disable all non-essential animations and reduce transition durations to 0ms
4. THE Design_System SHALL not introduce any animation that causes layout shift (CLS) or delays interactive readiness by more than 100ms
5. THE Design_System SHALL provide stagger-delay utilities (stagger-1 through stagger-10) for sequential child element animations with configurable base delay

### Requirement 14: Responsive Premium Experience

**User Story:** As a user on mobile or tablet, I want the premium visual treatment to adapt gracefully to smaller screens, so that the experience remains polished on all devices.

#### Acceptance Criteria

1. WHILE the viewport width is below 768px, THE Design_System SHALL reduce backdrop-blur intensity to 8px and simplify box-shadows to single-layer to maintain performance
2. WHILE the viewport width is below 768px, THE Profile_Card_Grid SHALL display in a 2-column layout with maintained card hover effects
3. WHILE the viewport width is below 768px, THE Intel_Engine_Dashboard SHALL stack the chart and ML scoring panels vertically with 16px gap
4. WHILE the viewport width is below 768px, THE Navigation_Header gradient and glow effects SHALL remain active at reduced intensity
5. THE Design_System SHALL maintain a minimum touch target size of 44x44px for all interactive elements on mobile viewports
