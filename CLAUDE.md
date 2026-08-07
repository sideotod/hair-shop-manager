## Project Goal

Build high-quality web application frontends with consistent visual direction, reusable design systems, restrained motion, strong accessibility, and browser-verified implementation quality.

This file defines how frontend-related skills should be selected, ordered, and constrained.

---

## Core Principles

1. Do not activate every frontend skill at once.
2. Assign one primary skill to each stage.
3. Treat brand tokens and approved Figma designs as hard constraints.
4. Use MengTo skills only for targeted visual patterns, layouts, and effects.
5. Prefer usability, accessibility, clarity, and performance over decoration.
6. Never claim that a screen is complete before verifying it in a real browser.
7. Preserve existing architecture, component APIs, and product behavior unless the task explicitly requires changes.

---

## Frontend Skill Pipeline

Use the following pipeline for frontend work:

```text
UI UX Pro Max or Figma-to-code
→ frontend-design
→ Vercel Agent Skills
→ selected MengTo skills
→ design-motion-principles
→ animate
→ Playwright MCP
→ impeccable
→ Playwright MCP final verification

```

Not every task requires every stage. Use only the stages relevant to the request.

---

## 1. Requirements and Product Context

Before changing the interface, identify:

- product type
- target users
- primary user task
- page or screen purpose
- required states
- responsive targets
- accessibility requirements
- existing design system
- existing technical constraints
- definition of done

For web applications, always consider:

- loading states
- empty states
- error states
- disabled states
- validation states
- permission-restricted states
- long content
- narrow viewports
- keyboard navigation
- focus visibility

Do not begin visual redesign before the task and required states are understood.

---

## 2. Source of Truth Priority

When instructions conflict, use this priority order:

```text
1. Explicit user requirements
2. Existing product behavior and architecture
3. Approved Figma design
4. Brandkit and theme tokens
5. Existing design-system components
6. Accessibility and platform constraints
7. frontend-design direction
8. Vercel frontend guidelines
9. MengTo implementation patterns
10. impeccable polish suggestions

```

Lower-priority skills must not override higher-priority constraints.

---

## 3. UI UX Pro Max

Use UI UX Pro Max when:

- no complete Figma design exists
- a dashboard, admin panel, SaaS UI, table, form, or data-heavy screen is being designed
- typography, color, spacing, density, navigation, or chart direction must be selected
- a reusable design system is needed
- the current screen lacks a coherent UI foundation

Expected output:

- product-appropriate layout direction
- color and typography system
- spacing and density rules
- component hierarchy
- table, form, navigation, and chart conventions
- responsive behavior
- accessibility considerations

UI UX Pro Max should define the practical UI foundation, not add decorative effects.

---

## 4. Figma-to-Code

Use Figma-to-code when an approved Figma design exists.

When Figma is provided:

- treat Figma as the visual source of truth
- preserve layout, spacing, typography, colors, components, and hierarchy
- do not invent a new art direction
- infer only missing responsive and interaction behavior
- reuse existing project components where possible
- map Figma tokens to existing code tokens
- avoid hardcoded values when reusable tokens exist

The implementation should prioritize fidelity and maintainability equally.

frontend-design should act only as a reviewer when Figma already defines the visual direction.

---

## 5. frontend-design

Use frontend-design to establish or strengthen the overall visual direction.

It may decide:

- layout rhythm
- visual hierarchy
- typography scale
- use of contrast
- composition
- whitespace
- imagery treatment
- component emphasis
- page-level art direction

It must not:

- replace approved brand colors
- replace approved fonts
- override Figma without explicit permission
- introduce a conflicting component system
- sacrifice usability for visual novelty
- apply dramatic styles to every component

Use one clear visual concept. Avoid mixing several unrelated aesthetics.

---

## 6. Vercel Agent Skills

Use Vercel frontend-related skills for:

- React implementation quality
- Next.js conventions
- rendering strategy
- component boundaries
- performance
- bundle size
- image loading
- caching
- accessibility
- web interface guideline checks

These skills govern frontend engineering quality.

They take priority over decorative MengTo patterns when performance, accessibility, or maintainability conflicts arise.

For React or Next.js work:

- avoid unnecessary client components
- minimize avoidable re-renders
- preserve semantic HTML
- use framework-native image and routing patterns
- prevent layout shift
- keep interactive boundaries narrow
- avoid shipping large libraries for trivial effects

---

## 7. MengTo Skills

MengTo skills are targeted implementation recipes.

Use them for:

- page structure
- specific layout systems
- visual surface treatments
- GSAP patterns
- scroll effects
- WebGL effects
- typography treatments
- CSS effects
- interaction patterns

### Selection Limit

For one page or screen, use at most:

```text
1 page or layout skill
1 visual style skill
2 effect or motion skills

```

Do not load unrelated MengTo skills together.

### Recommended Categories

For web applications, prefer restrained skills such as:

- operational-enterprise-ai
- product-proof-saas
- technical-wireframe-info-layout
- split-layout-technical
- editorial-tech
- nested-container-frames
- container-lines
- beautiful-shadows
- progressive-blur
- animation-systems

Use cautiously:

- cursor trails
- heavy WebGL backgrounds
- long scroll storytelling
- continuous decorative motion
- strong parallax
- cinematic transitions on operational screens

MengTo effects must not interfere with:

- keyboard navigation
- form completion
- table readability
- content scanning
- performance
- reduced-motion preferences
- application state changes

---

## 8. Motion Workflow

Motion must be designed before it is implemented.

Use this order:

```text
design-motion-principles
→ selected MengTo motion recipe when needed
→ animate

```

### design-motion-principles

This skill defines:

- why an element moves
- what information the motion communicates
- timing
- easing
- hierarchy
- interruption behavior
- reduced-motion behavior

### animate

This skill implements the approved motion rules.

It must not invent a second motion system.

### Motion Defaults

Use restrained defaults unless the task explicitly requests expressive motion:

```yaml
motion:
  micro_interaction: 120-180ms
  component_transition: 180-280ms
  panel_transition: 220-360ms
  page_transition: 300-500ms
  enter_easing: ease-out
  exit_easing: ease-in

```

Preferred animated properties:

- opacity
- transform
- clip-path when justified

Avoid:

- layout-shifting hover effects
- long blocking transitions
- constant decorative movement
- simultaneous animation of many unrelated regions
- animation that delays user input
- animation without reduced-motion support

For `prefers-reduced-motion`, disable or simplify:

- parallax
- scrubbed timelines
- cursor effects
- background particles
- large spatial transitions

---

## 9. Playwright MCP Verification

Use Playwright MCP after meaningful visual or interaction changes.

Playwright is an observation and verification tool, not an art director.

### Required Viewports

Check at least:

```text
375 × 812
768 × 1024
1440 × 900

```

Add larger or smaller sizes when the product requires them.

### Required Checks

Inspect:

- overflow
- clipped content
- spacing consistency
- alignment
- typography
- color contrast
- hover states
- focus states
- keyboard navigation
- loading states
- empty states
- error states
- open menus and dialogs
- long text
- responsive navigation
- reduced-motion behavior

### Fixing Loop

For each verification round:

1. capture the current state
2. list concrete issues
3. prioritize the highest-impact issues
4. fix no more than three issue groups at once
5. capture again
6. check for regressions

Issue priority:

```text
1. Broken behavior and overflow
2. Accessibility and readability
3. Responsive failures
4. Alignment and spacing
5. Visual polish

```

Do not trigger unlimited redesign loops.

---

## 10. impeccable

Use impeccable after implementation and browser verification.

Its role is to refine:

- inconsistent spacing
- alignment errors
- typography inconsistencies
- color inconsistencies
- unclear hierarchy
- weak focus states
- accessibility problems
- responsive roughness
- excessive visual noise
- awkward microcopy
- inconsistent component states

It must not:

- replace the approved visual concept
- restructure the entire page without evidence
- introduce new colors or fonts outside the token system
- remove functional states
- rewrite stable architecture
- add decorative effects merely to increase visual complexity

Use impeccable as a polishing and consistency pass.

---

## 11. Final Verification

After impeccable changes, run Playwright MCP again.

The task is complete only when:

- no obvious overflow remains
- primary workflows work
- keyboard focus is visible
- responsive layouts are usable
- loading, empty, and error states are handled
- reduced motion is respected
- design tokens are consistently used
- no unnecessary visual effects remain
- no new regressions were introduced
- the result matches approved Figma or documented direction

Do not describe the work as complete without this verification.

---

## Task Routing

### New Web App Without Figma

```text
1. Define product context and states
2. UI UX Pro Max
3. frontend-design
4. Vercel frontend guidance
5. Select targeted MengTo skills
6. design-motion-principles
7. animate
8. Playwright MCP
9. impeccable
10. Playwright MCP final verification

```

### Existing Figma Design

```text
1. Define implementation scope
2. Figma-to-code
3. Vercel frontend guidance
4. Add MengTo skills only for explicitly required effects
5. design-motion-principles
6. animate
7. Playwright MCP comparison
8. impeccable
9. Playwright MCP final verification

```

### Existing UI That Feels Plain

```text
1. Playwright MCP capture
2. Identify usability and hierarchy problems
3. UI UX Pro Max or frontend-design
4. Apply one targeted MengTo style or layout skill
5. Preserve information architecture and behavior
6. design-motion-principles if motion changes are needed
7. Playwright MCP
8. impeccable
9. Playwright MCP final verification

```

### Existing UI With Alignment or Color Problems

```text
1. Playwright MCP audit
2. Check tokens and component consistency
3. impeccable
4. Playwright MCP final verification

```

Do not use design-taste or broad art-direction skills for small consistency fixes.

### Motion-Only Task

```text
1. Inspect the current interaction
2. design-motion-principles
3. Select one MengTo motion recipe if needed
4. animate
5. Playwright MCP
6. Check reduced-motion behavior

```

### Performance-Only Task

```text
1. Vercel frontend performance guidance
2. Measure current behavior
3. Remove unnecessary effects
4. Optimize rendering and assets
5. Playwright MCP regression check

```

---

## Desktop Web Applications

For Electron or Tauri frontends, apply the same UI pipeline to the renderer layer.

Also account for:

- window resizing
- minimum window size
- keyboard shortcuts
- dense information layouts
- menu and context-menu behavior
- drag and drop
- offline states
- file-selection states
- long-running task progress
- native dialogs
- multiple windows
- platform-specific title bars

MengTo effects should be more restrained in desktop productivity applications.

Do not use Playwright alone to validate:

- filesystem behavior
- IPC
- application menus
- tray behavior
- auto-update behavior
- operating-system permissions

These require platform-specific integration tests.

---

## Component Rules

Prefer:

- reusable components
- semantic HTML
- explicit variants
- design tokens
- predictable component APIs
- accessible primitives
- local reasoning
- small, reviewable changes

Avoid:

- duplicated component styles
- arbitrary one-off spacing values
- deeply nested wrappers without purpose
- excessive card containers
- non-semantic clickable elements
- hidden focus outlines
- effects that obscure content
- global CSS overrides that break unrelated screens
- full-page rewrites for isolated requests

---

## Accessibility Rules

Always include:

- keyboard access
- visible focus states
- semantic structure
- labels for controls
- accessible dialog behavior
- sufficient contrast
- screen-reader-friendly status messages
- reduced-motion support
- touch targets appropriate to the platform

Accessibility failures take priority over decorative polish.

---

## Output Expectations

When completing frontend work, report:

1. what was implemented
2. which skills or stages were used
3. what constraints were preserved
4. what was verified in the browser
5. any remaining risks or limitations

Keep reports concrete. Do not claim visual or functional verification unless it was actually performed.

---

## Compact Skill Selection Rule

For most frontend tasks, use this minimal set:

```text
One foundation skill
+ one engineering skill
+ zero to two MengTo skills
+ one motion workflow when necessary
+ Playwright verification
+ impeccable polish

```

Examples:

```text
UI UX Pro Max
+ Vercel React guidance
+ MengTo technical-wireframe-info-layout
+ Playwright
+ impeccable

```

```text
Figma-to-code
+ Vercel Next.js guidance
+ MengTo progressive-blur
+ design-motion-principles
+ animate
+ Playwright
+ impeccable

```

The goal is not to use the most skills. The goal is to use the smallest compatible set that produces a coherent, maintainable, accessible result.