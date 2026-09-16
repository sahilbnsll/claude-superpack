# Frontend

Engineering correctness for user interfaces: accessibility, responsiveness, state coverage, motion, and perceived performance.

**Division of labour:** if the `frontend-design` skill is available, it owns visual identity — palette, typography, layout concept, aesthetic risk. This file owns whether the result is usable, reachable, and correct on real devices. Both matter; neither substitutes for the other.

## Decide first

- **Does this component already exist?** Most "add a modal" tasks are "use the existing modal". Grep the component directory before creating anything. A second dialog implementation is a permanent tax.
- **Where does state live?** Server state (fetched, cacheable, shared) and client state (transient, local) have different homes. Putting server data in a global store is the most common architecture mistake in React apps; it creates staleness bugs that look like race conditions.
- **Controlled or uncontrolled?** Pick per input and stay consistent. Mixed control is the source of "my value resets while typing".
- **What is the rendering model?** Server component, client component, static, streamed. Adding a hook to a server component is a build error; fetching in a client component when the server could have is a waterfall.

## Build right

### Every interactive surface needs five states

Not four. Ship all five or say which you skipped.

| State | Requirement |
|---|---|
| **Empty** | Explains what would be here and offers the action that creates it. Never a bare "No data". |
| **Loading** | Reserves the final layout so nothing jumps. Skeletons matching real dimensions beat spinners. |
| **Error** | Says what failed, in the interface's voice, with the action that recovers. Never a raw stack or error code alone. |
| **Partial** | Some data arrived, some failed. Show what you have; mark what is missing. Most UIs forget this one. |
| **Success** | The normal case, including the long-content and short-content variants. |

### Accessibility — the non-negotiable floor

This is the part most generated UI gets wrong, and it is mechanically checkable.

- **Semantics first.** A `<button>` is a button. `<div onClick>` is not keyboard reachable, not announced, and not focusable. Reach for ARIA only after the native element genuinely cannot do the job — a correct native element beats a div with four ARIA attributes.
- **Keyboard completeness.** Every action reachable by mouse is reachable by Tab/Shift-Tab/Enter/Space/Escape/arrows. Tab order follows visual order. No keyboard trap except an intentional modal trap that Escape releases.
- **Visible focus.** Never `outline: none` without a replacement. Focus must be visible against every background it can appear on. `:focus-visible` for the pointer/keyboard distinction.
- **Focus management.** Opening a dialog moves focus into it; closing returns focus to the trigger. Route changes move focus to the new heading, not to the top of a re-rendered body. Deleting a row moves focus somewhere sensible, not to `<body>`.
- **Names.** Every control has an accessible name — visible label, `aria-label`, or `aria-labelledby`. Icon-only buttons are the usual offenders. Inputs use `<label for>`, not placeholder-as-label (placeholders vanish on input and fail contrast).
- **Contrast.** WCAG 2.2 AA: 4.5:1 for body text, 3:1 for text ≥ 24px or ≥ 19px bold, 3:1 for the visual boundary of interactive controls and meaningful graphics. Check the actual computed colours, including hover, disabled, and dark mode.
- **Live regions.** Async results that appear without focus moving need `aria-live="polite"` (or `assertive` for errors), or a screen-reader user never learns anything happened.
- **Targets.** WCAG 2.2 AA target size is 24×24 CSS px minimum; 44×44 is the practical bar for primary touch actions. Spacing counts toward the requirement.
- **Errors.** Associate the message with the field via `aria-describedby`, set `aria-invalid`, and never signal state by colour alone — pair it with text or an icon.
- **Motion.** Respect `prefers-reduced-motion: reduce` — remove parallax, autoplay, and large transforms; keep small opacity changes. Nothing flashes more than three times per second.
- **Zoom and reflow.** Usable at 200% zoom and at 320 CSS px width without horizontal scrolling (data tables, diagrams, and code may scroll inside their own container).

### Responsive

- Design the narrow case first; widening is easier than rescuing. Test at 320, 375, 768, 1280, and one very wide viewport.
- Container queries over viewport queries when the component can appear in more than one column width.
- Test with real content lengths: the longest realistic name, an empty description, 200 rows. Fixed heights and `text-overflow: ellipsis` hide bugs rather than solving them.
- Use dynamic viewport units (`dvh`) rather than `vh` for full-height mobile layouts, or the mobile browser chrome will clip the bottom.
- Hover is not available on touch. Anything only reachable by hover is unreachable for a large share of users.

### Motion

- Motion earns its place by explaining a change: what opened, where a thing went, what is now loading. Decorative entrance animation on every section is the generic default and reads as machine-made.
- 150–250ms for small state changes, up to ~400ms for large surfaces. Longer feels broken; shorter reads as a glitch.
- Animate `transform` and `opacity`. Animating `width`, `height`, `top`, or `left` triggers layout on every frame.
- One orchestrated moment beats ten scattered ones.

### Perceived performance

- Optimistic UI for actions that almost always succeed — with a real rollback path when they do not.
- Skeletons sized to the real content, not generic grey bars of arbitrary height.
- Stream or paginate anything unbounded. A list that renders 10,000 rows will jank however fast the backend is.
- Debounce input-driven network calls (250–400ms is usually right); cancel superseded requests so a slow earlier response cannot overwrite a fast later one.

## Failure modes

| Symptom | Usual cause |
|---|---|
| Content jumps as it loads | No reserved space; images without `width`/`height` or `aspect-ratio` |
| "Works on my machine" layout bugs | Tested only at one viewport with short placeholder content |
| Screen reader says "button button" | Nested interactive elements, or an ARIA role duplicating a native one |
| Focus disappears after an action | The focused element was unmounted with no focus moved |
| Stale data after mutation | Cache not invalidated; server state duplicated into client state |
| Double submits | Button not disabled during the in-flight request, and no idempotency on the server |
| Flash of wrong theme | Theme resolved after first paint instead of before |
| Janky scroll | Layout-triggering animation, oversized images, or an unvirtualised long list |
| Form loses input on re-render | Component identity changes — a key that is an index, or a component defined inside render |

## Evidence

Ranked strongest first. Take the strongest one available and say which you used.

1. **Browser interaction** — drive the real app (Playwright, `webapp-testing`, or the browser tools), perform the user's actual path, assert the visible result. Screenshot the before and after.
2. **Component test** with user-event semantics: query by accessible role and name, not by test id. A test that passes using `getByRole('button', { name: 'Save' })` proves the control is also reachable by assistive technology.
3. **Automated a11y pass** — axe on the changed view. It catches contrast, names, and roles; it does not catch focus order or keyboard traps, so pair it with a manual Tab-through.
4. **Keyboard walkthrough** — Tab through the changed surface and report what you observed at each stop.
5. **Build and typecheck** — necessary, and nowhere near sufficient. A UI that compiles can still be unusable.

Never claim a UI works because the build passed.
