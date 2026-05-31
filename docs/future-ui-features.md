# Future Cockpit UI Features

*Captured: 2026-05-29. Reference for UI buttons removed during the v1 Cockpit cleanup.*

During the Cockpit UI cleanup, we removed several placeholder buttons that were present in the frontend components (`app.jsx`, `screens.jsx`, `drawers.jsx`, `epic-viewers.jsx`) but lacked backend implementation. 

If we want to build these features back into the UI in the future, here is what was removed and the backend requirements needed to make them functional.

---

## 1. Global Navigation (`app.jsx`)

| Feature | Intended Behavior | Backend Requirement |
|---------|-------------------|---------------------|
| **Search (⌘K)** | Global fuzzy search across all product assets, notes, and robots. | Need a `/api/search` endpoint that indexes or greps through the `~/.productflow/products/` directory and returns a structured list of matches. |
| **Refresh** | Hard reload of all frontend state from the backend. | Can just be a frontend `window.location.reload()` or a re-fetch of the `/api/state` endpoint. |
| **Settings** | Global configuration panel (e.g. configuring Anthropic API keys for direct API mode, changing dark/light theme). | Need a config store on the backend and `/api/config` endpoints to read/write global settings. |

## 2. Product & Artifact Views (`screens.jsx`)

| Feature | Intended Behavior | Backend Requirement |
|---------|-------------------|---------------------|
| **Filter & Search** | Filter the main Products table by stage, phase, or text search. | purely frontend state logic using React `useState` to filter the table rows. |
| **Re-check freshness** | Force a manual re-evaluation of the staleness policy for all robots on the current product. | Need a `/api/freshness/recalculate` POST endpoint that calls `freshnessTracker.check()` and saves the result to disk. |
| **Copy action** | Copy the recommended "Next Action" string from the Status Gate to the clipboard. | Purely frontend (`navigator.clipboard.writeText`), but removed to reduce clutter since the text is already readable. |
| **Collapse all / Refresh** | Controls for the Activity Log tree view. | Purely frontend state management for the tree component. |
| **Open product.md** | View the raw markdown of the product definition file inside the Cockpit. | Use existing `ArtifactViewer` but pass the `product.md` path. |

## 3. Artifact Actions (`drawers.jsx` & `screens.jsx`)

| Feature | Intended Behavior | Backend Requirement |
|---------|-------------------|---------------------|
| **Re-run robot** | Trigger a robot run directly from the UI without using the LLM client. | This requires the **Direct API Mode** (see `architecture-llm-discussion.md`). The backend would need a `/api/run` endpoint that orchestrates calling the Anthropic/OpenAI API directly. |
| **Reveal in Finder** | Open the artifact's folder directly in macOS Finder. | Need a backend endpoint `/api/reveal?path=...` that calls the Node.js `child_process.exec(open <path>)` command. (Web browsers cannot open Finder natively for security reasons). |
| **Open in Excel** | Open the Money `.xlsx` workbook directly in the native Excel app. | Similar to Reveal, requires a backend endpoint that executes `open <file.xlsx>`. |
| **Copy / Copy path** | Copy the absolute file path of the artifact to the clipboard. | Frontend clipboard API, though it's only useful if the user knows how to use terminal paths. |
| **Link** | Generate a deep-link URL to open the Cockpit directly to this artifact. | Frontend routing update to support deep-linking (e.g. `?artifact=...`) and parsing it on load. |

## 4. Epic / Phase 2 Viewers (`epic-viewers.jsx`)

| Feature | Intended Behavior | Backend Requirement |
|---------|-------------------|---------------------|
| **Approve [Section]** | Allow PM to explicitly mark a Phase 2 section (Scope, Tech, Design, etc.) as approved, freezing its state. | The original buttons sent a POST to `/api/select-experiment` with an invalid payload (`{ type, id, title }`) and failed with `400 Bad Request`. To implement this properly, we need a new `/api/approve-epic-section` endpoint that accepts `{ productSlug, sectionName }` and updates a master epic state file (e.g. `epic-approvals.json`) to track approval status across the 10 Phase 2 sections. |

---

## Implementation Priority

When picking features to restore, the highest ROI additions would be:
1. **Re-run robot**: Unlocks autonomous execution from the UI (tied to Direct API Mode).
2. **Reveal in Finder / Open in Excel**: Huge quality of life improvement for PMs who want to edit the financial models or move files around. Very easy to build on the backend using `child_process`.

## 5. Rich Artifact Renderer Pipeline

| Feature | Intended Behavior | Backend Requirement |
|---------|-------------------|---------------------|
| **Auto-generate Rich HTML Reports** | Automatically convert raw Markdown robot outputs (like the Detective competitive matrix) into interactive, beautifully designed HTML dashboards with charts and visuals, saving them alongside the Markdown. | A dedicated post-processing step (`presentation-generator.js` or `rich-renderer.js`) that triggers after a robot saves its output. It reads the structured Markdown data, passes it into an HTML template generator with Chart.js/Vega-lite configs, and writes the resulting `.html` file. This keeps the LLM output resilient and machine-readable (Markdown) while delivering the "wow" factor to the PM natively in the Cockpit. |
