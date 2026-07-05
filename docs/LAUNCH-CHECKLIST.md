# AutoPM Launch Checklist

Status as of 2026-07-05. Site is live at https://fluidumber.github.io/AutoPM/.

## ✅ Done

- [x] Marketing site built (`website/index.html`) and deployed via `gh-pages` branch
- [x] Showcase section with GearShare demo deck (`website/demo/gearshare.html`)
- [x] Waitlist form added (Formspree placeholder — see below)
- [x] Design-partner mailto CTA
- [x] `server.json` draft created in repo root (see MCP Registry below)

## 🔲 Waitlist — needs from Anand

The footer form posts to `https://formspree.io/f/REPLACE_WITH_FORMSPREE_ID`.
Until the real ID is set, JS intercepts submits and falls back to a prefilled
mailto (so no visitor ever hits a dead endpoint).

1. Create a form at https://formspree.io (free tier: 50 submissions/mo).
2. Give Claude the form ID (looks like `xqkrbdyz`) — or replace
   `REPLACE_WITH_FORMSPREE_ID` in `website/index.html` yourself and redeploy.
   The mailto fallback deactivates automatically once the placeholder is gone.

## 🔲 MCP Registry (official — registry.modelcontextprotocol.io)

The official registry requires the server to be installable from a package
registry (npm for Node servers). Steps, in order:

1. **npm publish (needs Anand)** — Claude cannot do this without npm auth:
   - Decide the package name. `autopm` may be taken or squat-risky on npm —
     check with `npm view autopm`; the safe default is the scoped name
     `@fluidumber/autopm` (update `package.json` `name` accordingly).
   - `package.json` needs before publish: real `author` field (currently
     "Your Name"), `repository` field, and the `mcpName` field
     (`"mcpName": "io.github.fluidumber/autopm"`) that the registry uses to
     verify package ↔ server identity.
   - `npm login && npm publish --access public`.
2. **Validate + publish server.json** — after npm publish:
   - Install the publisher CLI: `brew install mcp-publisher` (or download from
     github.com/modelcontextprotocol/registry releases).
   - Update `server.json` version/package name if they changed in step 1.
   - `mcp-publisher login github` (opens browser — needs Anand's GitHub, since
     the `io.github.fluidumber/*` namespace is verified via GitHub login).
   - `mcp-publisher publish`.

## 🔲 Community directories

- **Smithery (smithery.ai)** — sign in with the fluidumber GitHub account →
  "Add Server" → point at the repo. Stdio servers benefit from a minimal
  `smithery.yaml`; add one if Smithery's scanner asks for it.
- **PulseMCP (pulsemcp.com)** — submit via their "Submit a server" form
  (they also auto-index the official registry, so completing the MCP Registry
  step above usually gets AutoPM listed within days).
- **mcp.so** — submit via the "Submit" link on the site (GitHub repo URL is
  enough).
- After listing: add the registry/Smithery badges to `README.md`.

## 🔲 Real-deck showcase excerpts (needs Anand's approval)

Candidates found on disk — none published without explicit approval:

| Deck | Path | Note |
|---|---|---|
| StyleIQ — AI wardrobe co-pilot | `plans/presentation-styleiq-ai-wardrobe-style-co-pilot.html` | Polished 11-slide deck |
| AI fitness coaching app | `plans/ai-fitness-coaching-app-2026-04-15.html` | Older format |
| AutoPM self-analysis deck | `~/.productflow/products/autopm-productflow/assets/autopm-productflow-strategy-presentation.html` | Meta — pairs with the site's proof section |
| Lucidya CDP deck | `~/.productflow/products/lucidya-cdp/assets/2026-05-05-lucidya-cdp-strategy-presentation.html` | ⚠️ Appears to reference a real company — likely NOT publishable |

## 🗺️ Roadmap — site v1.2 (approved, not built)

- Scroll-driven Three.js "assembly line" hero (replaces/augments the CSS-3D console).
- Interactive cockpit demo (browse a sample product workspace in-page).
- Keep the current CSS-3D version as the reduced-motion / no-WebGL fallback.
