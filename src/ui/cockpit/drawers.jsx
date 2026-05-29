/* eslint-disable */
/* Drawers + detail screens: FreshnessDrawer, FeedbackPanel, ArtifactViewer, MoneyDetail */

const PFD = window.PFData;

/* ─────────────────── Freshness Explanation Drawer ─────────────── */

function FreshnessDrawer({ data, onClose, onOpenArtifact }) {
  const ref = useRef();
  useEffect(() => {
    if (data && ref.current) {
      const focusable = ref.current.querySelector("button, a, [tabindex]");
      focusable && focusable.focus();
    }
  }, [data]);

  useKey({ "Escape": () => data && onClose() });

  if (!data) return (
    <>
      <div className="drawer-overlay"/>
      <div className="drawer" aria-hidden="true"/>
    </>
  );

  const { robotKey, run, meta, productSlug } = data;
  const status = run.status;
  const days = run.lastRun ? Math.floor((PFD.TODAY.getTime() - new Date(run.lastRun).getTime()) / 86400000) : null;
  const policyDelta = days != null ? days - meta.windowDays : null;

  const explain = {
    fresh:   { title: "Output is fresh",       sub: "This artifact is within ProductFlow's freshness window. Safe to base review on." },
    stale:   { title: "Output is stale",       sub: "Last run exceeds the freshness policy window. The artifact still exists, but its conclusions may have drifted." },
    missing: { title: "Output is missing",     sub: "No artifact was generated for this robot yet. Run the robot to produce its output." },
    blocked: { title: "Robot is blocked",      sub: "Cannot run yet because a prior gate is not satisfied." },
    locked:  { title: "Phase 2 not promoted",  sub: "This Phase 2 robot will be available once Phase 1 is complete and promotion is confirmed." }
  };
  const ex = explain[status] || explain.missing;

  return (
    <>
      <div className={`drawer-overlay ${data ? "on" : ""}`} onClick={onClose}/>
      <div className={`drawer ${data ? "on" : ""}`} ref={ref} role="dialog" aria-label="Freshness explanation">
        <div className="drawer-head">
          <div>
            <h3>{ex.title}</h3>
            <div className="sub">{meta.label} robot · {meta.desc}</div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close drawer">
            <Icon.X width="13" height="13"/>
          </button>
        </div>

        <div className="drawer-body">
          <div style={{ marginBottom: 18 }}>
            <StatusBadge status={status}/>
            <p style={{ margin: "10px 0 0", color: "var(--text-1)", lineHeight: 1.55 }}>{ex.sub}</p>
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>Freshness math</div>
          <div className="kv-grid" style={{ rowGap: 10, gridTemplateColumns: "150px 1fr" }}>
            <div className="k">Last run</div>
            <div className="v">{run.lastRun ? <><strong>{PFD.formatDate(run.lastRun)}</strong> <span className="muted">({PFD.relativeTime(run.lastRun)})</span></> : <span className="muted">never</span>}</div>

            <div className="k">Age</div>
            <div className="v">{days != null ? <strong>{days} days</strong> : <span className="muted">—</span>}</div>

            <div className="k">Policy window</div>
            <div className="v">{meta.windowDays} days · <span className="muted">{meta.rationale}</span></div>

            <div className="k">Verdict</div>
            <div className="v">
              {status === "fresh"   && <span style={{ color: "var(--st-fresh)" }}>{policyDelta} days within window</span>}
              {status === "stale"   && <span style={{ color: "var(--st-stale)" }}>{policyDelta} days over window</span>}
              {status === "missing" && <span style={{ color: "var(--st-missing)" }}>no output to evaluate</span>}
            </div>

            <div className="k">Output path</div>
            <div className="v">
              {run.assetPath
                ? <PathChip path={run.assetPath} full/>
                : <span style={{ color: "var(--text-3)" }}>—</span>}
            </div>

            <div className="k">Policy source</div>
            <div className="v"><code className="mono">config/staleness-policy.json</code> · v1.0.0</div>
          </div>

          {status === "stale" && run.staleReason && (
            <div className="callout warn" style={{ marginTop: 18 }}>
              <strong style={{ color: "var(--text)" }}>Why this matters · </strong>
              {run.staleReason}
            </div>
          )}

          {status === "missing" && (
            <div className="callout" style={{ marginTop: 18 }}>
              <strong style={{ color: "var(--text)" }}>What to do · </strong>
              Run the {meta.label} robot via the ProductFlow CLI or run-robot command. Output will land at <code className="mono">products/{productSlug}/assets/&lt;date&gt;-{robotKey}.md</code>.
            </div>
          )}

          <div className="eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>Related</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
            <a className="path-chip" style={{ cursor: "pointer" }} onClick={() => onOpenArtifact && run.assetPath && onOpenArtifact(robotKey)}>
              <Icon.Doc width="11" height="11" style={{ color: "var(--text-3)" }}/>
              <span className="p">{run.assetPath || "no artifact"}</span>
            </a>
            <a className="path-chip" style={{ cursor: "pointer" }}>
              <Icon.Folder width="11" height="11" style={{ color: "var(--text-3)" }}/>
              <span className="p">products/{productSlug}/context/</span>
            </a>
          </div>
        </div>

        <div className="drawer-foot">
          <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
            Read directly from <code className="mono">products/{productSlug}/freshness.json</code>
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {run.assetPath && <button className="btn" onClick={() => onOpenArtifact && onOpenArtifact(robotKey)}><Icon.Eye width="12" height="12"/>Open artifact</button>}
            <button className="btn primary"><Icon.Refresh width="12" height="12"/>Re-run robot</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────── Artifact Viewer (markdown) ─────────────────── */

function ArtifactViewer({ artifact, product, onBack, onCopied }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const seed = PFD.FEEDBACK_SEED[artifact.id];
  const [submittedAt, setSubmittedAt] = useState(seed?.at || null);
  const [feedbackBuffer, setFeedbackBuffer] = useState(seed || null);

  const run = (PFD.ROBOT_RUNS[product.slug] || {})[artifact.robot];
  const meta = PFD.ROBOT_META[artifact.robot];
  const status = run?.status || "fresh";
  const days = run?.lastRun ? Math.floor((PFD.TODAY.getTime() - new Date(run.lastRun).getTime()) / 86400000) : null;

  /* ── Artifact body: fetch live, fall back to mock ─────────────────
     - When the HTTP API is reachable, hit /api/artifact?path=…
     - Otherwise (or on error / non-markdown), use the bundled mock body.
     We key the effect on artifact.path so re-selecting a different
     artifact triggers a fresh fetch and avoids cross-bleed. */
  const isHtml = artifact.type === "html";
  const isMarkdown = artifact.type === "markdown" || artifact.type === "pdd";
  const MOCK_BODY  = PFD.ARTIFACT_BODIES?.[artifact.id]
                  || PFD.ARTIFACT_BODY_FEASIBILITY_DESIGN
                  || "";
  const [body, setBody]         = useState(MOCK_BODY);
  const [bodySource, setSource] = useState("mock");   // "mock" | "live" | "loading" | "error"

  useEffect(() => {
    let cancelled = false;
    /* Reset to mock immediately so switching artifacts never shows the
       previous artifact's body during the fetch. */
    setBody(MOCK_BODY);
    setSource("mock");

    if (!isMarkdown) return;                          // xlsx / presentation: no body fetch
    const boot = window.PFBoot;
    if (!boot || boot.source !== "live" || typeof boot.fetchArtifactBody !== "function") return;

    setSource("loading");
    boot.fetchArtifactBody(artifact.path).then(
      (text) => {
        if (cancelled) return;
        if (text && text.length) { setBody(text); setSource("live"); }
        else                     { setSource("error"); }
      },
      ()      => { if (!cancelled) setSource("error"); }
    );

    return () => { cancelled = true; };
  }, [artifact.path, artifact.id, isMarkdown]);

  return (
    <div className="content-inner">
      <div className="page-h" style={{ alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div className="crumbs" style={{ marginBottom: 6 }}>
            <span className="crumb" onClick={onBack}>{product.name}</span>
            <span className="sep">/</span>
            <span className="crumb" onClick={onBack}>Artifacts</span>
            <span className="sep">/</span>
            <span className="crumb current">{meta?.label || artifact.robot}</span>
          </div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>{artifact.title}</h1>
          <div className="sub" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <StatusBadge status={status}/>
            <span>Generated {PFD.formatDate(artifact.generated)}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span>{artifact.size}</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <PathChip path={artifact.path}/>
          </div>
        </div>
        <div className="right">
          <button className="btn"><Icon.Folder width="12" height="12"/>Reveal in Finder</button>
          <button className={`btn ${showFeedback ? "primary" : ""}`} onClick={() => setShowFeedback(s => !s)}>
            <Icon.Sparkle width="12" height="12"/>
            {submittedAt ? "Edit feedback" : "Add feedback"}
          </button>
        </div>
      </div>

      {status === "stale" && days != null && (
        <div className="callout warn" style={{ marginBottom: 14 }}>
          <strong style={{ color: "var(--text)" }}>Stale — </strong>
          this artifact was generated {days} days ago, exceeding the {meta.windowDays}-day window. Treat the contents as historical.
        </div>
      )}

      <div className="artifact-shell" style={{ gridTemplateColumns: showFeedback ? "minmax(0, 1fr) 340px" : "minmax(0, 1fr)" }}>
        <div className="panel">
          <div className="sticky-meta">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{meta?.label}</span>
              <span style={{ color: "var(--text-4)" }}>·</span>
              <span>by robot</span>
              <span style={{ color: "var(--text-4)" }}>·</span>
              <span className="mono" style={{ color: "var(--text-3)" }}>{PFD.formatDate(artifact.generated)}</span>
              {bodySource === "live"    && <><span style={{ color: "var(--text-4)" }}>·</span><span className="mono" style={{ color: "var(--ok, #4B6A4F)", fontSize: 11 }}>live</span></>}
              {bodySource === "loading" && <><span style={{ color: "var(--text-4)" }}>·</span><span className="mono" style={{ color: "var(--text-3)", fontSize: 11 }}>loading…</span></>}
              {bodySource === "error"   && <><span style={{ color: "var(--text-4)" }}>·</span><span className="mono" style={{ color: "var(--warn, #8A6B23)", fontSize: 11 }}>fetch failed — showing mock</span></>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="iconbtn ghost-outline"><Icon.Copy width="12" height="12"/>Copy</button>
              <button className="iconbtn ghost-outline"><Icon.Link width="12" height="12"/>Link</button>
            </div>
          </div>
          <div className="panel-body" style={isHtml ? { padding: 0, height: "calc(100vh - 200px)", overflow: "hidden" } : {}}>
            {isHtml ? (
              <iframe src={`/api/artifact?path=${encodeURIComponent(artifact.path)}`} style={{ width: "100%", height: "100%", border: "none" }} title={artifact.title} />
            ) : (
              <MarkdownView source={body}/>
            )}
          </div>
        </div>

        {showFeedback && (
          <FeedbackPanel
            artifact={artifact}
            product={product}
            initial={feedbackBuffer}
            onSubmit={(fb) => { setFeedbackBuffer(fb); setSubmittedAt(new Date().toISOString()); onCopied("Feedback saved to ProductFlow"); }}
            onClose={() => setShowFeedback(false)}
            submittedAt={submittedAt}
          />
        )}
      </div>
    </div>
  );
}

function FeedbackPanel({ artifact, product, initial, onSubmit, onClose, submittedAt }) {
  const [rating, setRating] = useState(initial?.rating ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSubmit({ rating, notes });
    }, 550);
  };

  return (
    <div className="panel" style={{ position: "sticky", top: 0 }}>
      <div className="panel-h">
        <div className="title"><Icon.Sparkle width="13" height="13"/>Direct feedback</div>
        <button className="iconbtn" onClick={onClose} aria-label="Close feedback panel"><Icon.X width="12" height="12"/></button>
      </div>
      <div className="panel-body">
        <div className="callout" style={{ marginBottom: 14, fontSize: 11.5 }}>
          Submitting writes directly to ProductFlow's learning data. The next robot run will see this rating and these notes.
        </div>

        <div className="eyebrow" style={{ marginBottom: 8 }}>Rating</div>
        <div className="rating" role="radiogroup" aria-label="Rating">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              className={rating === n ? "on" : ""}
              onClick={() => setRating(n)}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} of 5`}
            >{n}</button>
          ))}
        </div>
        <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--text-3)" }}>
          {rating == null ? "How well does this output represent the right thinking?" : rating <= 2 ? "Significant rework needed" : rating === 3 ? "Usable; some changes" : rating === 4 ? "Good; minor adjustments" : "Ready to ship"}
        </div>

        <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Notes</div>
        <textarea className="notes" placeholder="What worked, what to change, evidence to include next time…" value={notes} onChange={e => setNotes(e.target.value)}/>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, textAlign: "right" }}>{notes.length}/2000</div>

        <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Persisting to</div>
        <div className="feedback-meta">
          <span className="k">product</span><span className="mono">{product.slug}</span>
          <span className="k">robot</span><span className="mono">{artifact.robot}</span>
          <span className="k">artifact</span><span className="mono" style={{ fontSize: 11 }}>{artifact.filename}</span>
          <span className="k">brain</span><span className="mono">brain-database.json</span>
        </div>

        {submittedAt && (
          <div style={{ marginTop: 14, padding: "8px 10px", borderRadius: 4, background: "var(--st-fresh-bg)", border: "1px solid var(--st-fresh-line)", fontSize: 11.5, color: "var(--st-fresh)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon.Check width="12" height="12"/>
            Saved · {PFD.relativeTime(submittedAt)}
          </div>
        )}
      </div>

      <div className="drawer-foot">
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>POST /api/feedback</span>
        <button
          className="btn primary"
          disabled={!rating || submitting}
          onClick={submit}
          style={{ opacity: !rating || submitting ? 0.55 : 1 }}
        >
          {submitting ? <><Icon.Spinner width="12" height="12"/>Saving…</> : <><Icon.Check width="12" height="12"/>Save feedback</>}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── Money Workbook Detail ─────────────────── */

function MoneyDetail({ artifact, product, onBack, onCopied }) {
  const moneyMd = (PFD.ARTIFACTS[product.slug] || []).find(a => a.robot === "money" && a.type === "markdown");
  return (
    <div className="content-inner">
      <div className="page-h" style={{ alignItems: "center" }}>
        <div>
          <div className="crumbs" style={{ marginBottom: 6 }}>
            <span className="crumb" onClick={onBack}>{product.name}</span>
            <span className="sep">/</span>
            <span className="crumb" onClick={onBack}>Artifacts</span>
            <span className="sep">/</span>
            <span className="crumb current">Money workbook</span>
          </div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>Money — Editable financial workbook</h1>
          <div className="sub">First-class .xlsx artifact, opened in Excel or Google Sheets. ProductFlow does not render spreadsheet formulas inline.</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="money-card">
            <div className="xlsx-bubble">XLSX</div>
            <div>
              <div className="name">{artifact.filename}</div>
              <div className="meta">Generated {PFD.formatDate(artifact.generated)} · {artifact.size} · {PFD.relativeTime(artifact.generated)}</div>
              <div style={{ marginTop: 10 }}><PathChip path={artifact.path} full/></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn primary"><Icon.Open width="12" height="12"/>Open in Excel</button>
              <button className="btn" onClick={() => onCopied("Path copied")}><Icon.Copy width="12" height="12"/>Copy path</button>
              <button className="btn subtle"><Icon.Folder width="12" height="12"/>Reveal</button>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>About this workbook</div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-1)", lineHeight: 1.55, maxWidth: "62ch" }}>
              The Money robot produces both a markdown summary (assumptions, levers, sensitivities) and an editable Excel workbook (revenue model, cost stack, scenario tabs). The workbook is the source of truth for figures; the markdown summary is the review-friendly snapshot.
            </p>
          </div>

          {moneyMd && (
            <div style={{ marginTop: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Related markdown</div>
              <div className="context-row" style={{ gridTemplateColumns: "auto 1fr auto", cursor: "default" }}>
                <Icon.Doc width="16" height="16" style={{ color: "var(--text-2)", marginTop: 2 }}/>
                <div>
                  <div className="title">{moneyMd.title}</div>
                  <div className="src">{moneyMd.size} · Generated {PFD.formatDate(moneyMd.generated)}</div>
                  <div style={{ marginTop: 6 }}><PathChip path={moneyMd.path} full/></div>
                </div>
                <div><button className="btn sm">Open</button></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="callout" style={{ marginTop: 14 }}>
        <strong style={{ color: "var(--text)" }}>v1 scope · </strong>
        ProductFlow does not parse or render spreadsheet contents. The workbook is treated as a first-class deliverable; rendering may arrive in a later wave.
      </div>
    </div>
  );
}

Object.assign(window, { FreshnessDrawer, ArtifactViewer, FeedbackPanel, MoneyDetail });
