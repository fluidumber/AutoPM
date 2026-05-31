/* ────────────────────────────────────────────────────────────────────
   api.js — Optional live-data overlay for the ProductFlow Cockpit

   How it works:
     1. data.js has already run and populated window.PFData with mock
        data shaped exactly like the real workspace.
     2. This file fires a single fetch to GET /api/bundle.
     3. If reachable: merges the live response into window.PFData,
        marks source = 'live', and lets the React app mount.
     4. If unreachable: leaves the mock data in place, marks
        source = 'mock', and the app still works for design review.

   The React app (app.jsx) awaits window.PFBoot.ready before mounting
   so it always renders with a consistent snapshot.
   ──────────────────────────────────────────────────────────────────── */

(function () {
  const API_BASE = (() => {
    // Allow override via URL ?api=http://localhost:5000
    const q = new URLSearchParams(location.search).get("api");
    if (q) return q.replace(/\/$/, "");
    
    // Auto-detect when served by our own HTTP server (e.g., if port is overridden)
    if (location.protocol.startsWith("http")) {
      return location.origin;
    }
    return "http://127.0.0.1:4321";
  })();

  const BOOT_TIMEOUT_MS = 1500;

  window.PFBoot = {
    source: "mock",
    apiBase: API_BASE,
    error: null,
    /* ready promise — resolves to { source, error? } once we know
       whether to use live data or fall back to mock */
    ready: null,
  };

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), ms);
      promise.then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); reject(e); }
      );
    });
  }

  /* Merge a live /api/bundle response onto window.PFData (which holds
     the mock seed). Replaces only the keys we know about, so any
     helper functions (relativeTime, formatDate, daysAgo, ROBOT_META,
     CONTEXT_TYPE_LABEL, etc.) stay intact. */
  function applyBundle(bundle) {
    const PFA = window.PFData;
    if (!PFA) {
      console.warn("[api] window.PFData not present — did data.js load?");
      return;
    }

    PFA.__source     = "live";
    PFA.__apiBase    = API_BASE;
    PFA.__generated  = bundle.generatedAt;

    if (bundle.workspace) {
      // Preserve binding visual in the UI footer with the LIVE host:port
      PFA.WORKSPACE = {
        ...PFA.WORKSPACE,
        ...bundle.workspace,
        binding: bundle.workspace.binding || API_BASE.replace(/^https?:\/\//, ""),
      };
    }

    if (Array.isArray(bundle.products)) {
      PFA.PRODUCTS = bundle.products;

      /* gates: the mock used a gatesFor(slug) function. We override it
         with a closure that returns the live computed gates. */
      const gateMap = Object.fromEntries(
        bundle.products.map((p) => [p.slug, p.gates || []])
      );
      PFA.gatesFor = (slug) => gateMap[slug] || [];

      /* robotRuns: keyed by slug → { robotKey: runEntry } */
      PFA.ROBOT_RUNS = Object.fromEntries(
        bundle.products.map((p) => [p.slug, p.robotRuns || {}])
      );
    }

    if (bundle.artifacts) PFA.ARTIFACTS = bundle.artifacts;
    if (bundle.context)   PFA.CONTEXT   = bundle.context;
    if (bundle.activity)  PFA.ACTIVITY  = bundle.activity;
    if (bundle.policy)    PFA.STALENESS_POLICY = bundle.policy;
    if (bundle.feedback)  PFA.FEEDBACK_EVENTS = bundle.feedback;
  }

  window.PFBoot.refreshBundle = async function() {
    try {
      const resp = await fetch(`${API_BASE}/api/bundle`, { headers: { Accept: "application/json" } });
      if (!resp.ok) return false;
      const bundle = await resp.json();
      applyBundle(bundle);
      return true;
    } catch {
      return false;
    }
  };

  /* Kick off the connect attempt. Resolves the ready promise
     regardless of outcome. */
  window.PFBoot.ready = (async () => {
    try {
      const resp   = await withTimeout(
        fetch(`${API_BASE}/api/bundle`, { headers: { Accept: "application/json" } }),
        BOOT_TIMEOUT_MS
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const bundle = await resp.json();
      applyBundle(bundle);
      window.PFBoot.source = "live";
      console.log(
        `%c[ProductFlow] connected to ${API_BASE} — using LIVE data`,
        "color: #4B6A4F; font-weight: 600;"
      );
    } catch (err) {
      window.PFBoot.source = "mock";
      window.PFBoot.error  = err.message;
      if (window.PFData) {
        window.PFData.__source  = "mock";
        window.PFData.__apiBase = API_BASE;
        window.PFData.__error   = err.message;
      }
      console.log(
        `%c[ProductFlow] API at ${API_BASE} not reachable (${err.message}) — using MOCK data`,
        "color: #8A6B23; font-weight: 600;"
      );
    }
    return { source: window.PFBoot.source, error: window.PFBoot.error };
  })();

  /* Fetcher for artifact bodies (used by ArtifactViewer when running
     against the live API). Returns null if the API is unreachable —
     callers should fall back to the mock body. */
  window.PFBoot.fetchArtifactBody = async function (relPath) {
    if (window.PFBoot.source !== "live") return null;
    try {
      const resp = await fetch(`${API_BASE}/api/artifact?path=${encodeURIComponent(relPath)}`);
      if (!resp.ok) return null;
      return await resp.text();
    } catch {
      return null;
    }
  };
})();
