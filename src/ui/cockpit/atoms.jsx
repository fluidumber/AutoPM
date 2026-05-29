/* eslint-disable */
/* Atoms: icons, status, path chips, copy-to-clipboard, basic utilities */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ── Icons ───────────────────────────────────────────────────── */

const Icon = {
  Check:    (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3.5 8.5l3 3 6-7"/></svg>,
  X:        (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>,
  Dot:      (p) => <svg viewBox="0 0 16 16" fill="currentColor" {...p}><circle cx="8" cy="8" r="3"/></svg>,
  Clock:    (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2.2 1.5"/></svg>,
  Alert:    (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2.5L14 13H2L8 2.5z"/><path d="M8 7v3M8 11.5v.4"/></svg>,
  Q:        (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6c0-1.1 0.9-2 2-2s2 0.9 2 2c0 1.5-2 1.5-2 3"/><circle cx="8" cy="12" r="0.6" fill="currentColor"/></svg>,
  Lock:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3.5" y="7.5" width="9" height="6" rx="1"/><path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2"/></svg>,
  Copy:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="5" y="5" width="8" height="8" rx="1.2"/><path d="M5 11H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1"/></svg>,
  Open:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 3h3v3"/><path d="M13 3l-6 6"/><path d="M12.5 9.5V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h3.5"/></svg>,
  ChevR:    (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 4l4 4-4 4"/></svg>,
  ChevD:    (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6l4 4 4-4"/></svg>,
  Cmd:      (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 1 1-1.5-1.5h6a1.5 1.5 0 1 1-1.5 1.5v-6a1.5 1.5 0 1 1 1.5 1.5h-6"/></svg>,
  Search:   (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="7" cy="7" r="4"/><path d="M10 10l3 3"/></svg>,
  Filter:   (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2.5 4h11M5 8h6M7 12h2"/></svg>,
  Doc:      (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M9 2v3h3"/><path d="M5.5 9h5M5.5 11.5h3.5"/></svg>,
  Xlsx:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 2h5l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M9 2v3h3"/><path d="M5.5 9l4 3.5M5.5 12.5l4-3.5"/></svg>,
  Stack:    (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2l6 3-6 3-6-3 6-3z"/><path d="M2 8l6 3 6-3M2 11l6 3 6-3"/></svg>,
  Folder:   (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 4.5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5z"/></svg>,
  Settings: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M1.5 8h2M12.5 8h2M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/></svg>,
  Grid:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}><rect x="2.5" y="2.5" width="4.5" height="4.5"/><rect x="9" y="2.5" width="4.5" height="4.5"/><rect x="2.5" y="9" width="4.5" height="4.5"/><rect x="9" y="9" width="4.5" height="4.5"/></svg>,
  List:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}><path d="M2.5 4h11M2.5 8h11M2.5 12h11"/></svg>,
  Sparkle:  (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4.2 4.2l2.1 2.1M9.7 9.7l2.1 2.1M4.2 11.8l2.1-2.1M9.7 6.3l2.1-2.1"/></svg>,
  Diff:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3v5M3 5h4M11 8v5M9 13h4M11 8v0"/><path d="M5 8c0 2 2 3 4 3"/></svg>,
  Link:     (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 5l-1.5 1.5a3 3 0 0 0 4.2 4.2L11 9.5"/><path d="M9 11l1.5-1.5a3 3 0 0 0-4.2-4.2L5 6.5"/></svg>,
  Workbook: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2.5" y="2.5" width="11" height="11" rx="1"/><path d="M2.5 6h11M6 2.5v11"/></svg>,
  Refresh:  (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8a5 5 0 0 1 8.5-3.5L13 6"/><path d="M13 3v3h-3"/><path d="M13 8a5 5 0 0 1-8.5 3.5L3 10"/><path d="M3 13v-3h3"/></svg>,
  Eye:      (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/></svg>,
  Spinner:  (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M8 1.5a6.5 6.5 0 1 1-6.5 6.5"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/></path></svg>
};

/* ── Status badge ────────────────────────────────────────────── */

const STATUS_DEF = {
  fresh:    { label: "Fresh",    icon: <Icon.Check/> },
  stale:    { label: "Stale",    icon: <Icon.Clock/> },
  missing:  { label: "Missing",  icon: <Icon.Alert/> },
  blocked:  { label: "Blocked",  icon: <Icon.X/> },
  passed:   { label: "Passed",   icon: <Icon.Check/> },
  current:  { label: "Current",  icon: <Icon.Dot/> },
  complete: { label: "Complete", icon: <Icon.Check/> },
  locked:   { label: "Locked",   icon: <Icon.Lock/> },
  mismatch: { label: "Mismatch", icon: <Icon.Diff/> }
};

function StatusBadge({ status, label, className = "", bare = false }) {
  const def = STATUS_DEF[status] || STATUS_DEF.missing;
  const clsStatus = status === "mismatch" ? "stale" : status;
  return (
    <span className={`status ${clsStatus} ${bare ? "bare" : ""} ${className}`}>
      <span className="icon">{def.icon}</span>
      <span>{label || def.label}</span>
    </span>
  );
}

/* ── Path chip with copy ─────────────────────────────────────── */

function PathChip({ path, root = window.PFData.WORKSPACE.root, onCopied, full = false }) {
  const display = full
    ? `${root}/${path}`
    : path.length > 56 ? "…" + path.slice(-54) : path;

  const handleCopy = (e) => {
    e.stopPropagation();
    const text = full ? display : `${root}/${path}`;
    try { navigator.clipboard.writeText(text); } catch { /* noop in sandbox */ }
    onCopied && onCopied(text);
  };

  return (
    <span className="path-chip" title={`${root}/${path}`}>
      <span className="p">{display}</span>
      <button onClick={handleCopy} aria-label="Copy path">
        <Icon.Copy width="11" height="11"/>
      </button>
    </span>
  );
}

/* ── Toast ───────────────────────────────────────────────────── */

function Toast({ message, on }) {
  return (
    <div className={`toast ${on ? "on" : ""}`} role="status" aria-live="polite">
      <span className="ok-dot"></span>
      <span>{message}</span>
    </div>
  );
}

/* ── Tiny markdown renderer (safe, structure-aware) ──────────── */

function MarkdownView({ source }) {
  const html = useMemo(() => renderMarkdown(source), [source]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      if (window.mermaid) {
        const nodes = containerRef.current.querySelectorAll('.mermaid[data-processed="false"]');
        nodes.forEach((node) => {
          const chart = node.textContent;
          const id = 'mermaid-svg-' + Math.random().toString(36).substr(2, 9);
          window.mermaid.render(id, chart).then(({ svg }) => {
            node.innerHTML = svg;
            node.setAttribute('data-processed', 'true');
          }).catch(e => {
            console.error("Mermaid error", e);
            node.innerHTML = `<pre style="color:var(--danger, red); background:var(--surface)">Mermaid Syntax Error</pre><pre>${escapeHtml(chart)}</pre>`;
            node.setAttribute('data-processed', 'error');
          });
        });
      }
      
      const tryVega = () => {
        if (window.vegaEmbed) {
          const vegaNodes = containerRef.current.querySelectorAll('.vega-chart[data-processed="false"]');
          vegaNodes.forEach((node) => {
            try {
              const spec = JSON.parse(node.textContent);
              window.vegaEmbed(node, spec, { actions: false }).then(() => {
                node.setAttribute('data-processed', 'true');
              }).catch(e => {
                console.error("Vega error", e);
                node.innerHTML = `<pre style="color:var(--danger, red); background:var(--surface)">Vega Error: ${e.message}</pre><pre>${escapeHtml(node.textContent)}</pre>`;
                node.setAttribute('data-processed', 'error');
              });
            } catch(err) {
              node.innerHTML = `<pre style="color:var(--danger, red); background:var(--surface)">JSON Parse Error</pre><pre>${escapeHtml(node.textContent)}</pre>`;
              node.setAttribute('data-processed', 'error');
            }
          });
        } else {
          setTimeout(tryVega, 50);
        }
      };
      tryVega();
    }
  }, [html]);

  return <div ref={containerRef} className="md" dangerouslySetInnerHTML={{ __html: html }}/>;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s) {
  let out = escapeHtml(s);
  // code spans
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  // bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|\W)_([^_]+)_/g, "$1<em>$2</em>");
  return out;
}

function renderMarkdown(src) {
  const lines = src.split(/\n/);
  let out = "";
  let i = 0;

  const isTableRow = (s) => /^\s*\|.*\|\s*$/.test(s);
  const isTableSep = (s) => /^\s*\|?[\s:-]+\|[\s:|-]+\|?\s*$/.test(s);

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { out += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; i++; continue; }

    // Blockquote
    if (/^>\s?/.test(line)) {
      let buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out += `<blockquote>${inline(buf.join(" "))}</blockquote>`;
      continue;
    }

    // Tables
    if (isTableRow(line) && isTableRow(lines[i + 1] || "") && isTableSep(lines[i + 1])) {
      const headers = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(s => inline(s.trim()));
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(s => inline(s.trim())));
        i++;
      }
      out += "<table><thead><tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr></thead><tbody>"
        + rows.map(r => "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>").join("")
        + "</tbody></table>";
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      out += "<ul>" + items.map(x => `<li>${inline(x)}</li>`).join("") + "</ul>";
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out += "<ol>" + items.map(x => `<li>${inline(x)}</li>`).join("") + "</ol>";
      continue;
    }

    // Code fence
    const codeMatch = line.match(/^```([a-zA-Z0-9_-]+)?/);
    if (codeMatch) {
      const lang = codeMatch[1];
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      const codeStr = buf.join("\n");
      if (lang === "mermaid") {
        out += `<div class="mermaid" data-processed="false" style="margin: 16px 0;">${escapeHtml(codeStr)}</div>`;
      } else if (lang === "json" && codeStr.includes("vega-lite")) {
        out += `<div class="vega-chart" data-processed="false" style="margin: 16px 0;">${escapeHtml(codeStr)}</div>`;
      } else {
        out += `<pre><code>${escapeHtml(codeStr)}</code></pre>`;
      }
      continue;
    }

    // Paragraph / blank
    if (line.trim() === "") { i++; continue; }
    let buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,4}\s|>|[-*]\s|\d+\.\s|\|.*\||```)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out += `<p>${inline(buf.join(" "))}</p>`;
  }

  return out;
}

/* ── Hooks ───────────────────────────────────────────────────── */

function useToast() {
  const [state, setState] = useState({ on: false, msg: "" });
  const tRef = useRef();
  const show = (msg) => {
    clearTimeout(tRef.current);
    setState({ on: true, msg });
    tRef.current = setTimeout(() => setState(s => ({ ...s, on: false })), 1800);
  };
  return { ...state, show };
}

function useKey(handlers) {
  useEffect(() => {
    const fn = (e) => {
      const h = handlers[e.key];
      if (h) h(e);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });
}

Object.assign(window, { Icon, StatusBadge, PathChip, Toast, MarkdownView, useToast, useKey });
