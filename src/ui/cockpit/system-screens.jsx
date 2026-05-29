/* eslint-disable */
/* System screens: Feedback Inbox, Staleness Policy */

const PFS = window.PFData;

/* ─────────────────── Feedback Inbox ─────────────────────────── */

function FeedbackInbox({ onProduct, onArtifact }) {
  const events = PFS.FEEDBACK_EVENTS;
  const [filter, setFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [selected, setSelected] = useState(events[0]?.id);

  const filtered = useMemo(() => {
    let out = events;
    if (filter !== "all") out = out.filter(e => String(e.rating) === filter);
    if (productFilter !== "all") out = out.filter(e => e.productSlug === productFilter);
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [filter, productFilter]);

  const current = filtered.find(e => e.id === selected) || filtered[0];

  // Distribution
  const dist = useMemo(() => {
    const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const e of filtered) out[e.rating] = (out[e.rating] || 0) + 1;
    return out;
  }, [filtered]);
  const avg = filtered.length ? (filtered.reduce((s, e) => s + e.rating, 0) / filtered.length).toFixed(2) : "0.00";

  return (
    <div className="content-inner">
      <div className="page-h">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>System</div>
          <h1>Feedback inbox</h1>
          <div className="sub">
            All direct-feedback events persisted into ProductFlow.
            <span style={{ margin: "0 8px", color: "var(--text-4)" }}>·</span>
            <span className="mono" style={{ color: "var(--text-2)" }}>brain/brain-database.json</span>
          </div>
        </div>
        <div className="right">
          <button className="btn"><Icon.Filter width="12" height="12"/>Export</button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 24, alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Events captured</div>
            <div style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "-0.01em" }}>{filtered.length}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>across {new Set(filtered.map(e => e.productSlug)).size} products · last 30 days</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Average rating</div>
            <div style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontWeight: 500, letterSpacing: "-0.01em" }}>
              {avg}<span style={{ color: "var(--text-3)", fontSize: 14, fontWeight: 400 }}> / 5</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{filtered.filter(e => e.rating >= 4).length} of {filtered.length} ≥ 4</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Distribution</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {[1,2,3,4,5].map(r => {
                const pct = filtered.length ? (dist[r] / filtered.length) * 100 : 0;
                return (
                  <div key={r}>
                    <div style={{ height: 32, background: "var(--surface-2)", border: "1px solid var(--line-soft)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${pct}%`, background: r >= 4 ? "var(--st-fresh)" : r === 3 ? "var(--st-stale)" : "var(--st-missing)", opacity: 0.85 }}/>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-3)", display: "flex", justifyContent: "space-between" }}>
                      <span>{r}</span>
                      <span className="mono">{dist[r]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text-3)" }}>Rating</span>
        <div className="seg">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>All</button>
          {[5,4,3,2,1].map(r => (
            <button key={r} className={filter === String(r) ? "on" : ""} onClick={() => setFilter(String(r))}>{r}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 8 }}>Product</span>
        <div className="seg">
          <button className={productFilter === "all" ? "on" : ""} onClick={() => setProductFilter("all")}>All</button>
          {PFS.PRODUCTS.map(p => (
            <button key={p.slug} className={productFilter === p.slug ? "on" : ""} onClick={() => setProductFilter(p.slug)}>{p.name.split(" ")[0]}</button>
          ))}
        </div>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }} className="mono">{filtered.length} of {events.length}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        {/* Events table */}
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ width: 38 }}>Rating</th>
                <th>Robot</th>
                <th>Product</th>
                <th style={{ width: 80 }}>When</th>
                <th style={{ width: 28 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const prod = PFS.PRODUCTS.find(p => p.slug === e.productSlug);
                const isActive = current && current.id === e.id;
                return (
                  <tr key={e.id} onClick={() => setSelected(e.id)} className={isActive ? "active" : ""}>
                    <td>
                      <span className="mono" style={{
                        display: "inline-grid", placeItems: "center",
                        width: 24, height: 22, borderRadius: 4,
                        background: e.rating >= 4 ? "var(--st-fresh-bg)" : e.rating === 3 ? "var(--st-stale-bg)" : "var(--st-missing-bg)",
                        color: e.rating >= 4 ? "var(--st-fresh)" : e.rating === 3 ? "var(--st-stale)" : "var(--st-missing)",
                        border: `1px solid ${e.rating >= 4 ? "var(--st-fresh-line)" : e.rating === 3 ? "var(--st-stale-line)" : "var(--st-missing-line)"}`,
                        fontSize: 12, fontWeight: 600
                      }}>{e.rating}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{PFS.ROBOT_META[e.robot]?.label || e.robot}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{e.notes}</div>
                    </td>
                    <td><span style={{ fontSize: 12 }}>{prod?.name || e.productSlug}</span></td>
                    <td className="mono" style={{ color: "var(--text-3)" }}>{PFS.relativeTime(e.at)}</td>
                    <td><Icon.ChevR width="12" height="12" style={{ color: "var(--text-4)" }}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty">
              <div className="icon-bubble"><Icon.Sparkle width="16" height="16"/></div>
              <h3>No feedback matches</h3>
              <p>Try clearing the filters.</p>
            </div>
          )}
        </div>

        {/* Selected event detail */}
        <div className="panel" style={{ position: "sticky", top: 0 }}>
          {current && (() => {
            const prod = PFS.PRODUCTS.find(p => p.slug === current.productSlug);
            const meta = PFS.ROBOT_META[current.robot];
            const art = current.artifactId ? (PFS.ARTIFACTS[current.productSlug] || []).find(a => a.id === current.artifactId) : null;
            return (
              <>
                <div className="panel-h">
                  <div className="title"><Icon.Sparkle width="13" height="13"/>Feedback event</div>
                  <span className="status fresh" style={{ height: 20, fontSize: 11 }}>{current.status}</span>
                </div>
                <div className="panel-body">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span className="mono" style={{
                      display: "inline-grid", placeItems: "center",
                      width: 40, height: 40, borderRadius: 8,
                      background: current.rating >= 4 ? "var(--st-fresh-bg)" : current.rating === 3 ? "var(--st-stale-bg)" : "var(--st-missing-bg)",
                      color: current.rating >= 4 ? "var(--st-fresh)" : current.rating === 3 ? "var(--st-stale)" : "var(--st-missing)",
                      border: `1px solid ${current.rating >= 4 ? "var(--st-fresh-line)" : current.rating === 3 ? "var(--st-stale-line)" : "var(--st-missing-line)"}`,
                      fontSize: 18, fontWeight: 600
                    }}>{current.rating}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{meta?.label || current.robot}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{PFS.formatDate(current.at)} · {PFS.relativeTime(current.at)}</div>
                    </div>
                  </div>

                  <div className="eyebrow" style={{ marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.55, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--line-soft)", borderRadius: 4, marginBottom: 14 }}>
                    {current.notes}
                  </div>

                  <div className="kv-grid" style={{ gridTemplateColumns: "90px 1fr" }}>
                    <div className="k">Product</div>
                    <div className="v">
                      <button className="btn subtle sm" onClick={() => onProduct(current.productSlug)} style={{ padding: 0, height: "auto", color: "var(--accent-ink)" }}>
                        {prod?.name || current.productSlug} <Icon.ChevR width="11" height="11"/>
                      </button>
                    </div>
                    <div className="k">Persona</div>
                    <div className="v mono" style={{ fontSize: 11.5 }}>{current.persona}</div>
                    <div className="k">Robot</div>
                    <div className="v mono" style={{ fontSize: 11.5 }}>{current.robot}</div>
                    <div className="k">Artifact</div>
                    <div className="v">
                      {art
                        ? <button className="btn subtle sm" onClick={() => onArtifact(current.productSlug, art.id)} style={{ padding: 0, height: "auto", color: "var(--accent-ink)" }}><span className="mono" style={{ fontSize: 11.5 }}>{art.filename}</span> <Icon.ChevR width="11" height="11"/></button>
                        : <span className="muted" style={{ fontSize: 11.5 }}>—</span>}
                    </div>
                    <div className="k">Persisted</div>
                    <div className="v">
                      <span className="path-chip"><span className="p">brain/brain-database.json</span></span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Staleness Policy ─────────────────────────── */

function StalenessPolicy() {
  const policy = PFS.STALENESS_POLICY;
  const rows = Object.entries(PFS.ROBOT_META);
  const overrides = policy.overrides["autopm-productflow"] || {};
  const [phaseFilter, setPhaseFilter] = useState("all");
  const filtered = rows.filter(([_, m]) => phaseFilter === "all" || String(m.phase) === phaseFilter);

  return (
    <div className="content-inner">
      <div className="page-h">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>System</div>
          <h1>Staleness policy</h1>
          <div className="sub">
            Per-robot freshness windows that decide whether outputs are <span style={{ color: "var(--st-fresh)" }}>fresh</span> or <span style={{ color: "var(--st-stale)" }}>stale</span>.
            <span style={{ margin: "0 8px", color: "var(--text-4)" }}>·</span>
            <span className="mono" style={{ color: "var(--text-2)" }}>{policy.source} · v{policy.version}</span>
          </div>
        </div>
        <div className="right">
          <button className="btn"><Icon.Open width="12" height="12"/>Open file</button>
        </div>
      </div>

      {/* Resolution order */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-h">
          <div className="title"><Icon.Stack width="13" height="13"/>Resolution order</div>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>Highest tier wins</span>
        </div>
        <div className="panel-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {policy.resolutionOrder.map(t => (
              <div key={t.tier} style={{
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-1)",
                background: t.tier <= 2 ? "var(--accent-soft)" : "var(--surface-2)",
                borderColor: t.tier <= 2 ? "color-mix(in oklab, var(--accent) 25%, transparent)" : "var(--line)",
                position: "relative"
              }}>
                <div className="eyebrow" style={{ marginBottom: 6, color: t.tier <= 2 ? "var(--accent-ink)" : "var(--text-3)" }}>Tier {t.tier} · {t.precedence}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{t.name}</div>
                <code className="mono" style={{ fontSize: 11, color: "var(--text-3)", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{t.path}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Override status for this product */}
      {Object.keys(overrides).length > 0 && (
        <div className="callout" style={{ marginBottom: 16 }}>
          <strong style={{ color: "var(--text)" }}>Active overrides · </strong>
          For product <code className="mono">autopm-productflow</code>, {Object.keys(overrides).length} robot{Object.keys(overrides).length === 1 ? "" : "s"} use a non-default window.
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="seg">
          <button className={phaseFilter === "all" ? "on" : ""} onClick={() => setPhaseFilter("all")}>All robots ({rows.length})</button>
          <button className={phaseFilter === "1" ? "on" : ""} onClick={() => setPhaseFilter("1")}>Phase 1</button>
          <button className={phaseFilter === "2" ? "on" : ""} onClick={() => setPhaseFilter("2")}>Phase 2</button>
        </div>
        <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
          Interview answers: <span className="mono" style={{ color: "var(--text-1)" }}>{policy.interviewAnswers.windowDays}d</span>
        </span>
      </div>

      <div className="panel">
        <table className="tbl">
          <thead>
            <tr>
              <th>Robot</th>
              <th style={{ width: 60 }}>Phase</th>
              <th style={{ width: 90 }}>Window</th>
              <th>Effective for autopm-productflow</th>
              <th>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(([k, m]) => {
              const ov = overrides[k];
              const effective = ov?.windowDays ?? m.windowDays;
              return (
                <tr key={k}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{m.desc}</div>
                  </td>
                  <td><span className="mono" style={{ color: "var(--text-2)" }}>P{m.phase}</span></td>
                  <td>
                    <span className="mono" style={{ color: "var(--text-1)" }}>{m.windowDays}d</span>
                  </td>
                  <td>
                    {ov ? (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <span className="mono" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>{effective}d</span>
                        <span style={{ fontSize: 10.5, padding: "1px 6px", borderRadius: 3, background: "var(--accent-soft)", color: "var(--accent-ink)", border: "1px solid color-mix(in oklab, var(--accent) 25%, transparent)", textTransform: "uppercase", letterSpacing: 0.04 }}>
                          {ov.source}
                        </span>
                      </span>
                    ) : (
                      <span className="mono" style={{ color: "var(--text-3)" }}>{effective}d <span style={{ fontSize: 10.5, color: "var(--text-4)", textTransform: "uppercase", marginLeft: 4 }}>default</span></span>
                    )}
                  </td>
                  <td className="wrap" style={{ fontSize: 12, color: "var(--text-2)" }}>{ov?.note || m.rationale}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="callout" style={{ marginTop: 14 }}>
        <strong style={{ color: "var(--text)" }}>How to override · </strong>
        Edit <code className="mono">products/&lt;slug&gt;/staleness-overrides.json</code> or <code className="mono">profiles/&lt;slug&gt;/staleness-overrides.json</code>. ProductFlow re-reads on next workspace check.
      </div>
    </div>
  );
}

Object.assign(window, { FeedbackInbox, StalenessPolicy });
