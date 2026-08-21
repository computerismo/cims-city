# Fill the "Explore the Atlas" panel void by docking the route legend into its footer

**Root cause:** `.organization-nav` stretches the full column height (`grid-row: 2 / -1; align-self: stretch`) but its content (title + 3-4 groups, ~6-7 buttons in either scope) ends near the top — leaving the big white void. Meanwhile the "Connection Types" route legend wastes a collapsed chip in the map's bottom-right corner.

**Approach (chosen):** Move the legend into the left panel's bottom edge, expanded on desktop. The panel becomes a flex column: title → scrollable category list → pinned legend footer. The map's bottom-right corner is freed.

Key safety facts established during exploration: `measureSafeInsets()` has **no production consumer** (test-only), so no camera behavior can regress; no test pins DOM child order in the nav; the e2e stroke test reads computed `::before` styles, which resolve regardless of placement/visibility.

## 1. `src/ui/appShell.ts`
- **`renderNavigator`**: build `h2` title + a new `div.organization-nav__scroll` wrapper containing the category sections + re-append `legendDisclosure` as the navigator's last child (pins to panel bottom). Add focus-preservation for the legend toggle across re-renders (same pattern as the existing `focusedId` restore).
- Remove `legendDisclosure` from the `element.append(...)` shell children (line 166). Drop the `ui-panel` class from it (nav provides the chrome) — keep `route-legend` class, `[data-legend-toggle]`/`[data-legend]` hooks, and `data-safe-region` (keeps `measureSafeInsets` tests valid as-is).
- **Legend default state**: `legendExpanded = !compactLayout` (expanded on desktop, collapsed on compact); set initial `legend.hidden`/`aria-expanded` from it; collapse the legend when entering compact mode in `onCompactLayoutChange`.
- **Delete `syncCompactOverlays`** (+ call sites) and the legend branch in the compact focus logic: that rule existed only because the floating legend chip overlapped the compact detail sheet. Inside the nav overlay, the legend hides together with the navigator, and the nav overlay never overlaps the card (e2e already asserts no overlap).

## 2. `src/styles.css`
- `.organization-nav`: `display: flex; flex-direction: column;`; move `overflow-y: auto; overscroll-behavior: contain` into new `.organization-nav__scroll` (`flex: 1 1 auto; min-height: 0;` grid gap for groups); sticky group titles become `top: 0` (scrollport changed).
- `.route-legend`: remove grid placement (col 2/row 3) and the compact `position: absolute` rule; restyle as footer — `margin-top: auto; border-top: 1px solid var(--color-border); padding-block-start: var(--space-3);` full panel width for `[data-legend]` (drop `min(18rem, 42vw)`).
- Keep `.route-legend p::before` stroke styles and toggle sizing untouched (e2e pins strokes + ≥44px touch targets).

## 3. `src/ui/appShell.test.ts` sync (per pinned-value policy)
- Tests at lines 98-114 and 213-235: rewrite for new semantics — entering compact with detail open collapses the whole navigator (legend hides with it), focus still moves to `[data-detail-dismiss]`, legend reachable again via the explorer toggle; no per-element hidden rule.
- Test at 192-211: initial `aria-expanded` is now `'true'` on desktop; first click collapses (`onLegendDisclosureChange` → `false`).
- `measureSafeInsets` tests (278-316) unchanged.

## 4. Verification
- `npm run typecheck`, `npm run lint`, `npx vitest run src/ui/appShell.test.ts src/main.test.ts src/ui/presentation.test.ts`, then full `npm run test:run`.
- Visual: dev server + project Playwright captures at 1440×1000, 1024×768, 390×844 (explorer opened on mobile) — confirm legend docked at panel bottom, void filled, map corner free; inspect screenshots directly.
- e2e subset `npx playwright test e2e/neighborhood.spec.ts -g "legend|overview|overflow"`; compare failures against the known ~9 pre-existing HEAD GPU-stall failures before blaming edits.