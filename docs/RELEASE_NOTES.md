# ProductFlow Cockpit — Release Notes

**Date:** May 28, 2026
**Focus:** Visual Phase 1 Artifacts, Native Phase 2 Dashboards, and UI/UX Enhancements

This release transforms ProductFlow from a static markdown viewer into a fully interactive, visual, and highly structured PM workspace. We completely overhauled how Phase 1 outputs render rich diagrams, introduced dedicated structured Dashboards for Phase 2 Epics, and upgraded the base Cockpit UI for better layout control.

---

## 1. Native React Dashboards for Phase 2 Epics

Phase 2 robots no longer output flat text that PMs have to parse. The Cockpit now interprets Phase 2 outputs as **structured data** and maps them to bespoke, interactive React viewers. 

### Architecture & Implementation:
- **`epic-viewers.jsx` Registry:** We introduced a mapping registry that assigns specific React components based on the artifact slug. 
- **Legacy Migration (`fix-legacy-data.js`):** A backend script was implemented to retroactively parse all legacy flat `.md` files for Phase 2 artifacts into robust JSON objects (`rawLegacyContent`). This enables backwards compatibility while strictly enforcing the new data contract for the frontend.

### New Interactive Viewers:
- **`FeasibilityTechViewer`:** Renders architecture and infrastructure dependencies visually using Mermaid diagrams alongside vendor and security constraints.
- **`FeasibilityDesignViewer`:** Provides an organized breakdown of design principles, wireflows, and accessibility impact.
- **`RisksRegistryViewer`:** Parses risk categories and displays them in a dynamic 3x3 severity matrix, highlighting critical issues automatically.
- **`GtmReadinessViewer`:** Organizes rollout waves and GTM milestones into a visual timeline.
- **`CustomerJourneysViewer`:** Breaks down complex, multi-persona user journeys into an interactive stepper component, allowing PMs to navigate the narrative step-by-step.

---

## 2. Visual Markdown Rendering (Phase 1 Support)

We upgraded the base Markdown engine (`atoms.jsx`) to natively support embedded diagramming languages. Instead of seeing raw code fences for charts, PMs now see the final rendered output inline.

- **Mermaid.js Integration:** The renderer detects ````mermaid` blocks (like the SWOT diagrams in `detective-output.md` or flows in `priority-output.md`) and compiles them into interactive SVGs on the fly.
- **Vega-Lite Integration:** We added support for rendering ````json` blocks that declare a `"vega-lite"` schema. This allows complex financial and metric charts (such as ARR Projections and Unit Economics in `money-output.md`) to be rendered as visual, interactive charts automatically.
- **Fail-Safe Loading:** Both engines load asynchronously via the browser. If a robot generates a syntax error, the renderer elegantly falls back to a syntax-highlighted code block with a clear error boundary.

---

## 3. UI/UX Workspace Polish

To support the richer, more visually demanding outputs, we enhanced the Cockpit layout:
- **Draggable Sidebar:** We implemented a `sidebar-resizer` component using React lifecycle events. The left column (Files Tree) is now fully adjustable via click-and-drag (min 200px, max 800px).
- **Horizontal Scrolling:** We removed aggressive text-cropping on the file tree. The left column now supports horizontal scrolling, ensuring long legacy filenames or deeply nested directory structures remain fully legible.

---

## Technical Summary
- **Frontend Stack:** React 18 (in-browser Babel), CSS Variables, Vega-Lite v5, Mermaid v10.
- **Files Modified:** 
  - `src/ui/cockpit/epic-viewers.jsx` (New Viewer Components)
  - `src/ui/cockpit/atoms.jsx` (Markdown Parser extensions)
  - `src/ui/cockpit/screens.jsx` (Sidebar resizing logic)
  - `src/ui/cockpit/styles.css` (Layout and horizontal scrolling)
  - `src/ui/cockpit/index.html` (Script injection for Vega/Mermaid)
  - `scripts/fix-legacy-data.js` (Migration script)
