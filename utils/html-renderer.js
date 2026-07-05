// html-renderer.js — Converts raw markdown to a fully styled HTML document.
// Preserves raw HTML tags (e.g. <canvas>, <script>) and Mermaid blocks 
// so that Claude's generated interactive charts render natively.

export function packageHtml(markdown, title = "Analysis Output") {
    const htmlBody = markdownToHtml(markdown);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- Fonts -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap">
  
  <!-- Visualization Libraries -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5/build/vega-lite.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js"></script>

  <style>
    :root {
      --bg: #FCFBF7;
      --text: #1B1A16;
      --text-1: #2F2D27;
      --text-2: #5D5A4F;
      --line: #E2DED2;
      --accent: #4B6A4F;
      --accent-soft: #DDE6DC;
      --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
      --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
    }
    
    body {
      font-family: var(--font-sans);
      color: var(--text-1);
      background: var(--bg);
      line-height: 1.6;
      padding: 40px 24px 80px;
      margin: 0;
      -webkit-font-smoothing: antialiased;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* Markdown Typography */
    h1, h2, h3, h4 {
      color: var(--text);
      font-weight: 600;
      margin-top: 1.8em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 28px; margin-top: 0; letter-spacing: -0.01em; }
    h2 { font-size: 20px; padding-top: 0.8em; border-top: 1px solid var(--line); }
    h3 { font-size: 16px; }
    
    p { margin: 0.8em 0; }
    
    ul, ol { padding-left: 1.5em; margin: 0.8em 0; }
    li { margin: 0.3em 0; }
    
    /* Code Blocks */
    code {
      font-family: var(--font-mono);
      font-size: 0.9em;
      background: rgba(0, 0, 0, 0.04);
      padding: 2px 4px;
      border-radius: 3px;
    }
    pre {
      background: rgba(0, 0, 0, 0.03);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 14px 16px;
      overflow-x: auto;
      margin: 1.2em 0;
    }
    pre code { background: transparent; padding: 0; }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: 14px;
    }
    table th, table td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
    }
    table th {
      background: rgba(0, 0, 0, 0.03);
      font-weight: 600;
      color: var(--text);
    }
    table tr:hover td {
      background: rgba(0, 0, 0, 0.01);
    }
    
    /* Blockquotes */
    blockquote {
      margin: 1.5em 0;
      padding: 12px 16px;
      border-left: 4px solid var(--accent);
      color: var(--text-2);
      background: rgba(0, 0, 0, 0.02);
      border-radius: 0 4px 4px 0;
    }
    blockquote p:first-child { margin-top: 0; }
    blockquote p:last-child { margin-bottom: 0; }
    
    /* Charts & Visuals spacing */
    canvas, .mermaid, .vega-chart {
      margin: 24px 0;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlBody}
  </div>

  <script>
    // Initialize Mermaid diagrams automatically
    if (window.mermaid) {
      mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function translateMarkdown(text) {
    // Only translates bold, italics, and inline code.
    // DOES NOT escape < or > so that inline HTML tags (like <canvas>) pass through natively!
    return text
        .replace(/\\\|/g, "|")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
}

function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

// Block-level tags that may span multiple lines and must never be <p>-wrapped.
// A <script> split across <p> tags breaks its JavaScript entirely.
const RAW_BLOCK_TAG = /^\s*<(script|style|div|table|section|article|details|figure|canvas|svg|iframe|blockquote|header|footer|aside|nav|form|video)\b/i;

let vegaChartCounter = 0;

function markdownToHtml(md) {
    const lines = md.split("\n");
    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Raw multi-line HTML block — buffer until the opening tag closes,
        // then pass through untouched so scripts and styled divs stay intact.
        const rawMatch = line.match(RAW_BLOCK_TAG);
        if (rawMatch) {
            const tag = rawMatch[1].toLowerCase();
            const openRe = new RegExp(`<${tag}\\b(?![^>]*/>)`, "gi");
            const closeRe = new RegExp(`</${tag}>`, "gi");
            const buf = [line];
            let depth = (line.match(openRe) || []).length - (line.match(closeRe) || []).length;
            i++;
            while (i < lines.length && depth > 0) {
                buf.push(lines[i]);
                depth += (lines[i].match(openRe) || []).length - (lines[i].match(closeRe) || []).length;
                i++;
            }
            out.push(buf.join("\n"));
            continue;
        }

        // Any other line starting with an HTML tag passes through raw (single-line HTML)
        if (/^\s*<[a-zA-Z!/]/.test(line)) {
            out.push(line);
            i++;
            continue;
        }

        // Code fence
        if (line.startsWith("```")) {
            const lang = line.slice(3).trim();
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            
            const joined = codeLines.join("\n");
            if (lang === "html") {
                // Pass raw HTML code block through so scripts and canvases execute
                out.push(joined);
            } else if (lang === "mermaid") {
                // Wrap in mermaid div for rendering
                out.push(`<div class="mermaid">\n${joined}\n</div>`);
            } else if (lang === "json" && /vega-lite/i.test(joined) && isValidJson(joined)) {
                // Vega-Lite spec — render as a live chart via vega-embed
                const chartId = `vega-chart-${vegaChartCounter++}`;
                out.push(`<div id="${chartId}" class="vega-chart"></div>
<script>
  if (window.vegaEmbed) {
    vegaEmbed('#${chartId}', ${joined}, { actions: false });
  }
</script>`);
            } else {
                // Standard code block, needs escaping
                const escapedCode = codeLines.map(escapeHtml).join("\n");
                out.push(`<pre><code class="language-${escapeHtml(lang)}">${escapedCode}</code></pre>`);
            }
            i++;
            continue;
        }

        // Table
        if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].startsWith("|---")) {
            const headers = line.split("|").slice(1, -1).map(h => `<th>${translateMarkdown(h.trim())}</th>`).join("");
            i += 2;
            const rowHtml = [];
            while (i < lines.length && lines[i].startsWith("|")) {
                const cells = lines[i].split("|").slice(1, -1).map(c => `<td>${translateMarkdown(c.trim())}</td>`).join("");
                rowHtml.push(`<tr>${cells}</tr>`);
                i++;
            }
            out.push(`<table><thead><tr>${headers}</tr></thead><tbody>${rowHtml.join("")}</tbody></table>`);
            continue;
        }

        // Heading
        const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
        if (hMatch) {
            const level = hMatch[1].length;
            out.push(`<h${level}>${translateMarkdown(hMatch[2])}</h${level}>`);
            i++;
            continue;
        }

        // Blockquote
        if (line.startsWith("> ")) {
            out.push(`<blockquote><p>${translateMarkdown(line.slice(2))}</p></blockquote>`);
            i++;
            continue;
        }

        // Horizontal rule
        if (line.match(/^---+$/)) {
            out.push("<hr />");
            i++;
            continue;
        }

        // Bullet list
        if (line.startsWith("- ") || line.startsWith("* ")) {
            const items = [];
            while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
                items.push(`<li>${translateMarkdown(lines[i].slice(2))}</li>`);
                i++;
            }
            out.push(`<ul>${items.join("")}</ul>`);
            continue;
        }

        // Empty line
        if (line.trim() === "") {
            i++;
            continue;
        }

        // Paragraph
        out.push(`<p>${translateMarkdown(line)}</p>`);
        i++;
    }

    return out.join("\n");
}
