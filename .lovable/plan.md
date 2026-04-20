

# Canvas & Takeoff Editor — Phased Overhaul Roadmap

Goal: beat MeasureSquare on **speed of takeoff**, **estimate accuracy**, and **mobile/on-site usability**. Each phase ships independently. We approve and execute one phase at a time.

---

## Phase 1 — Speed of Takeoff (the biggest UX gap)

Reduce clicks-per-room and make drawing feel effortless.

1. **Keyboard-first drawing model**
   - Persistent shortcut HUD (toggle with `?`) showing every tool key.
   - `Tab` cycles tools, `Space` = temporary pan, `Esc` = always cancels current op cleanly.
   - Number keys `1-9` jump to tools (Select/Draw/Rect/Hole/Door/Transition/Scale).
2. **Smarter dimension input overlay**
   - Type-as-you-draw: typing any digit while drawing auto-focuses the dimension input (no click needed).
   - Tab between length and angle fields; Enter commits.
   - Remember last unit per project; show recent values as quick-pick chips.
3. **Smart room templates**
   - "L-shape", "U-shape", "Rectangle with notch" presets — click to drop, drag corners to size.
   - Replaces tedious polyline drawing for the 80% case.
4. **Auto-close detection improvements**
   - When polyline endpoint comes within snap radius of start, show a glowing "click to close" indicator with the resulting area preview live.
5. **Multi-room rectangle batch mode**
   - Hold `Shift` after rectangle tool to keep placing rectangles without re-selecting the tool.
6. **Background image enhancements**
   - Drag-to-calibrate scale directly on a known dimension on the PDF (currently requires tool switch).
   - Auto-fit & one-click "lock background" after calibration.

**Files touched:** `EditorCanvas.tsx`, `EditorToolbar.tsx`, `DimensionInputOverlay.tsx`, `KeyboardShortcutsPanel.tsx`, new `RoomTemplates.tsx`, `useCanvasEditing.ts`.

---

## Phase 2 — Accuracy of Estimates (quiet differentiator)

Make the numbers MeasureSquare produces look sloppy by comparison.

1. **Live measurement HUD**
   - Always-visible status overlay showing: selected room area (net + order), perimeter, count of doors/transitions, applied waste %. Updates as you drag.
2. **Edge length inline editing**
   - Click any edge dimension label to type a new exact length — vertex moves to satisfy it while preserving adjacent angles.
3. **Right-angle enforcement toggle**
   - Optional mode that snaps every drawn segment to 90°/45° relative to previous segment, with visual indicator.
4. **Smart waste suggestions per room**
   - Inline badge on each room in the Takeoff panel: "Suggested waste 8% (currently 10%)" with one-click accept, based on room shape complexity and material roll width.
5. **Cross-room cut optimizer surfacing**
   - Promote the existing `CrossRoomOptimizer` from a buried report to an always-visible "Material Efficiency" card showing $ saved by combining cuts.
6. **Seam preview on canvas, not just in modal**
   - Render seam lines directly on rooms by default for roll goods; drag to nudge; show conflict highlights with doors/avoid zones.

**Files touched:** `CanvasRenderer.tsx`, `CanvasStatusBar.tsx`, `TakeoffPanel.tsx`, `useCanvasEditing.ts`, `lib/reports/wasteCalculator.ts`, `SeamEditor.tsx`.

---

## Phase 3 — Mobile & On-Site Usability (where MeasureSquare is weakest)

Make the iPad/phone experience first-class so estimators can quote on site.

1. **Touch-optimized drawing**
   - Long-press for context menu, two-finger pinch-zoom (already exists — verify smoothness), three-finger pan.
   - Larger hit targets for vertices/handles when `coarse` pointer detected.
2. **Floating contextual toolbar**
   - Replace the current bottom FAB with a smart contextual bar that appears next to the selected room/door/transition with the most likely 3-4 actions.
3. **Tap-to-edit dimensions on mobile**
   - Tap any edge label → number pad overlay with unit toggle.
4. **Offline-capable canvas**
   - Service worker + IndexedDB cache for the active project so on-site estimators can keep drawing if connection drops, syncing when back online.
5. **Photo background capture**
   - "Take photo" button (mobile) → use device camera → place as background image with quick scale calibration.
6. **Mobile-friendly Takeoff panel**
   - Convert right-hand sidebar to a swipe-up bottom sheet on phones with snap points (peek / half / full).

**Files touched:** `MobileToolFAB.tsx` → `ContextualToolbar.tsx`, `MobileSidebarDrawer.tsx`, `useTouchGestures.ts`, `EditorCanvas.tsx`, new `useOfflineSync.ts`, service worker setup.

---

## Phase 4 — Polish & Performance (the "feels expensive" pass)

1. Audit all canvas re-render paths; ensure 60fps with 50+ rooms (profile with React DevTools + Performance panel).
2. Replace remaining modals with inline panels or popovers where possible.
3. Consistent micro-animations on tool switch, room select, snap acquisition.
4. Empty states and onboarding tooltips on first project.
5. Dark mode parity check across canvas overlays.

---

## Execution Model

- We tackle **one phase per approval cycle**.
- After each phase: I list every change, you test end-to-end, we adjust, then move on.
- Recommended start: **Phase 1** (highest user-visible impact, lowest risk).

Reply "Approve Phase 1" (or pick a different phase to start with) and I'll produce the detailed per-task implementation plan for that phase.

