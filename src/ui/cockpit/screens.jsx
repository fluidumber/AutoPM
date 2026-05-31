/* eslint-disable */
/* Screens: WorkspaceCheck, ProductIndex, ProductHome (+ tabs), ArtifactViewer, MoneyDetail */

const PF = window.PFData;

/* ─────────────────────── Workspace Check ─────────────────────── */

function WorkspaceCheck({ onContinue }) {
  const [step, setStep] = useState(0);
  const checks = PF.WORKSPACE.checks;
  useEffect(() => {
    if (step >= checks.length) return;
    const t = setTimeout(() => setStep(s => s + 1), step === 0 ? 350 : 180);
    return () => clearTimeout(t);
  }, [step]);
  const done = step >= checks.length;

  return (
    <div className="workspace-screen">
      <div className="eyebrow" style={{ marginBottom: 10 }}>ProductFlow Cockpit · Local Workspace</div>
      <h1>Validating your workspace</h1>
      <p className="sub">
        Checking the directory at <code className="mono" style={{ background: "var(--surface)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--line)" }}>{PF.WORKSPACE.root}</code>.
        ProductFlow only reads files. Nothing is uploaded.
      </p>

      <div className="check-list">
        {checks.map((c, i) => {
          const state = i < step ? "ok" : i === step ? "pending" : "pending";
          return (
            <div key={c.id} className={`check-row ${state === "ok" ? "" : "pending"}`}>
              <div className="icon">
                {state === "ok"
                  ? <Icon.Check width="12" height="12"/>
                  : i === step
                    ? <Icon.Spinner width="12" height="12"/>
                    : <Icon.Dot width="8" height="8"/>}
              </div>
              <div>
                <div className="label">{c.label}{c.note && state === "ok" ? <span style={{ color: "var(--text-3)" }}> · {c.note}</span> : null}</div>
                <span className="target">{c.target}</span>
              </div>
              <div>
                {state === "ok" && <StatusBadge status="passed" label="ok" bare/>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          Resolved from <code className="mono">{PF.WORKSPACE.resolvedFrom}</code> · API on <code className="mono">{PF.WORKSPACE.binding}</code>
        </div>
        <button
          className={`btn primary ${done ? "" : ""}`}
          onClick={onContinue}
          disabled={!done}
          style={{ opacity: done ? 1 : 0.5 }}
        >
          Open product index <Icon.ChevR width="12" height="12"/>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── Product Index ───────────────────────── */

function ProductIndex({ onOpen }) {
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [hoverIdx, setHoverIdx] = useState(null);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...PF.PRODUCTS].sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (sortBy === "updated") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [sortBy, sortDir]);

  const setSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };
  const sortInd = (col) => sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : "";

  return (
    <div className="content-inner">
      <div className="page-h">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Workspace</div>
          <h1>Products</h1>
          <div className="sub">3 products on disk · active persona <span className="mono" style={{ color: "var(--text-1)" }}>anand-rao</span></div>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th className="sortable" onClick={() => setSort("name")} style={{ width: "26%" }}>Product <span className="sort-ind">{sortInd("name")}</span></th>
              <th className="sortable" onClick={() => setSort("stage")}>Stage <span className="sort-ind">{sortInd("stage")}</span></th>
              <th>Current Gate</th>
              <th>Owner</th>
              <th>Rollups</th>
              <th className="sortable" onClick={() => setSort("updated")} style={{ width: 110 }}>Updated <span className="sort-ind">{sortInd("updated")}</span></th>
              <th style={{ width: 28 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => (
              <tr key={p.slug} onClick={() => onOpen(p.slug)} onMouseEnter={() => setHoverIdx(idx)} onMouseLeave={() => setHoverIdx(null)} tabIndex="0" onKeyDown={(e) => e.key === "Enter" && onOpen(p.slug)}>
                <td className="wrap">
                  <div style={{ fontWeight: 500, color: "var(--text)" }}>{p.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{p.slug}</div>
                </td>
                <td>
                  <span style={{ fontSize: 12 }}>{p.stage}</span>
                </td>
                <td><span className="status current" style={{ fontFamily: "var(--font-mono)" }}>{p.currentGate}</span></td>
                <td>
                  <span className="muted" style={{ fontSize: 12 }}>{p.ownerPersona}</span>
                </td>
                <td>
                  <RollupRow rollups={p.rollups} compact/>
                </td>
                <td className="mono" style={{ color: "var(--text-2)" }}>{PF.relativeTime(p.updated)}</td>
                <td><Icon.ChevR width="12" height="12" style={{ color: "var(--text-4)" }}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="callout" style={{ marginTop: 14 }}>
        <strong style={{ color: "var(--text)" }}>Local-first.</strong> ProductFlow reads only files inside <code className="mono">$PRODUCTFLOW_HOME</code>.
        To add a product, run <code className="mono">productflow product-create</code> in your terminal.
      </div>
    </div>
  );
}

function RollupRow({ rollups, compact = false, onClick }) {
  const items = [
    { k: "fresh",   n: rollups.fresh },
    { k: "stale",   n: rollups.stale },
    { k: "missing", n: rollups.missing },
    { k: "blocked", n: rollups.blocked },
    { k: "locked",  n: rollups.locked }
  ].filter(x => x.n > 0);
  return (
    <div className="rollups">
      {items.map(it => (
        <span key={it.k} className={`rollup ${it.k}`} onClick={(e) => { e.stopPropagation(); onClick && onClick(it.k); }}>
          <span className="num">{it.n}</span>
          <span>{it.k}</span>
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────── Product Home ─────────────────────────── */

function ProductHome({ product, tab, onTab, onArtifact, onMoney, onFreshness, view, onView, onCopied, onPickEpic }) {
  let robotsCount = Object.keys(PF.ROBOT_META).filter(k => PF.ROBOT_META[k].phase === 1).length;
  Object.values(product.asks || {}).forEach(ask => {
    Object.values(ask.epics || {}).forEach(epic => {
      if (epic.robots) {
        robotsCount += Object.values(epic.robots).filter(r => r && r.status !== "missing").length;
      }
    });
  });

  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "status",    label: "Status",         count: 8 },
    { id: "robots",    label: "Robots",         count: robotsCount },
    { id: "artifacts", label: "Artifacts",      count: (PF.ARTIFACTS[product.slug] || []).length },
    { id: "context",   label: "Context",        count: (PF.CONTEXT[product.slug] || []).length }
  ];

  return (
    <div className="content-inner">
      <div className="page-h">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Product · {product.stage}</div>
          <h1>{product.name}</h1>
          <div className="sub">
            <span className="mono" style={{ color: "var(--text-2)" }}>products/{product.slug}/</span>
            <span style={{ margin: "0 8px", color: "var(--text-4)" }}>·</span>
            Updated {PF.relativeTime(product.updated)}
            <span style={{ margin: "0 8px", color: "var(--text-4)" }}>·</span>
            Owner <span className="mono" style={{ color: "var(--text-2)" }}>{product.ownerPersona}</span>
          </div>
        </div>
        <div className="right">
          <RollupRow rollups={product.rollups} onClick={(k) => onTab && onTab("robots")}/>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => onTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
            {t.count != null && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "overview"  && <OverviewTab product={product} onTab={onTab} onArtifact={onArtifact} onMoney={onMoney} onFreshness={onFreshness}/>}
      {tab === "status"    && <StatusTab product={product} onTab={onTab} onArtifact={onArtifact}/>}
      {tab === "robots"    && <RobotsTab product={product} onArtifact={onArtifact} onFreshness={onFreshness} view={view} onView={onView} onPickEpic={onPickEpic}/>}
      {tab === "artifacts" && <ArtifactsTab product={product} onArtifact={onArtifact} onMoney={onMoney} onCopied={onCopied}/>}
      {tab === "context"   && <ContextTab product={product}/>}
    </div>
  );
}

/* ─────────────────── Overview tab ─────────────────────────── */

function OverviewTab({ product, onTab, onArtifact, onMoney, onFreshness }) {
  const artifacts = PF.ARTIFACTS[product.slug] || [];
  const recentArtifacts = artifacts.slice(0, 5);
  const activity = PF.ACTIVITY[product.slug] || [];
  const moneyXlsx = artifacts.find(a => a.type === "xlsx");
  const moneyMd = artifacts.find(a => a.robot === "money" && a.type === "markdown");

  return (
    <div className="home-grid">
      <div className="col">
        <NextActionCard action={product.nextAction} onTab={onTab}/>

        {/* Product metadata */}
        <div className="panel">
          <div className="panel-h">
            <div className="title"><Icon.Stack width="13" height="13"/>Product overview</div>
          </div>
          <div className="panel-body">
            <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--text-1)", lineHeight: 1.55, maxWidth: "60ch" }}>
              {product.overview}
            </p>
            <div className="kv-grid">
              <div className="k">Target market</div>
              <div className="v">{product.targetMarket}</div>
              <div className="k">Competitors</div>
              <div className="v">
                <div className="chips">
                  {product.competitors.map(c => <span key={c} className="chip">{c}</span>)}
                </div>
              </div>
              <div className="k">Tags</div>
              <div className="v">
                <div className="chips">
                  {product.tags.map(t => <span key={t} className="chip">{t}</span>)}
                </div>
              </div>
              <div className="k">Created</div>
              <div className="v">{PF.formatDate(product.created)}</div>
              <div className="k">Path</div>
              <div className="v"><PathChip path={`products/${product.slug}`} full/></div>
            </div>
          </div>
        </div>

        {/* Recent artifacts */}
        <div className="panel">
          <div className="panel-h">
            <div className="title"><Icon.Doc width="13" height="13"/>Recent artifacts</div>
            <button className="btn subtle sm" onClick={() => onTab("artifacts")}>View all <Icon.ChevR width="11" height="11"/></button>
          </div>
          <div className="panel-body flush">
            <table className="tbl">
              <tbody>
                {recentArtifacts.map(a => (
                  <tr key={a.id} onClick={() => a.type === "xlsx" ? onMoney(a) : onArtifact(a)}>
                    <td style={{ width: 28 }}>
                      {a.type === "xlsx" ? <Icon.Xlsx width="14" height="14" style={{ color: "#3F6A2A" }}/> :
                       a.type === "pdd" ? <Icon.Stack width="14" height="14" style={{ color: "var(--text-2)" }}/> :
                       a.type === "presentation" ? <Icon.Workbook width="14" height="14" style={{ color: "var(--text-2)" }}/> :
                       <Icon.Doc width="14" height="14" style={{ color: "var(--text-2)" }}/>}
                    </td>
                    <td className="wrap" style={{ width: "50%" }}>
                      <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{a.title}</span>
                        {a.author && (
                          <span className="author-badge" title={`Generated by ${a.author}`}>
                            <Icon.User width="10" height="10"/> {a.author}
                          </span>
                        )}
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{a.path.replace(`products/${product.slug}/`, "")}</div>
                    </td>
                    <td><span className="muted" style={{ fontSize: 12 }}>{PF.ROBOT_META[a.robot]?.label || a.robot}</span></td>
                    <td className="mono" style={{ color: "var(--text-3)" }}>{PF.relativeTime(a.generated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {moneyXlsx ? (
          <div className="panel">
            <div className="panel-h">
              <div className="title"><Icon.Workbook width="13" height="13"/>Money workbook</div>
              <button className="btn subtle sm" onClick={() => onMoney(moneyXlsx)}>Open detail <Icon.ChevR width="11" height="11"/></button>
            </div>
            <div className="panel-body">
              <div className="money-card" style={{ border: 0, padding: 0, background: "transparent" }}>
                <div className="xlsx-bubble">XLSX</div>
                <div>
                  <div className="name">{moneyXlsx.filename}</div>
                  <div className="meta">Generated {PF.formatDate(moneyXlsx.generated)} · {moneyXlsx.size} · Editable in Excel / Google Sheets</div>
                  <div style={{ marginTop: 8 }}><PathChip path={moneyXlsx.path} full/></div>
                </div>
              </div>
            </div>
          </div>
        ) : moneyMd ? (
          <div className="panel">
            <div className="panel-h">
              <div className="title"><Icon.Workbook width="13" height="13"/>Money summary</div>
              <button className="btn subtle sm" onClick={() => onArtifact(moneyMd)}>Open summary <Icon.ChevR width="11" height="11"/></button>
            </div>
            <div className="panel-body">
              <div className="money-card" style={{ border: 0, padding: 0, background: "transparent" }}>
                <div className="xlsx-bubble" style={{ background: "linear-gradient(180deg, #DCE3F0, #B9C5DE)", borderColor: "#9BABC8", color: "#3B5485" }}>MD</div>
                <div>
                  <div className="name">{moneyMd.filename}</div>
                  <div className="meta">Generated {PF.formatDate(moneyMd.generated)} · {moneyMd.size} · Excel workbook pending</div>
                  <div style={{ marginTop: 8 }}><PathChip path={moneyMd.path} full/></div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="col">
        {/* Current Gate mini-summary */}
        <div className="panel">
          <div className="panel-h">
            <div className="title"><Icon.Sparkle width="13" height="13"/>Workflow gate</div>
            <button className="btn subtle sm" onClick={() => onTab("status")}>G1-G8 <Icon.ChevR width="11" height="11"/></button>
          </div>
          <div className="panel-body" style={{ paddingBottom: 6 }}>
            <GateMiniRibbon product={product} onTab={onTab}/>
          </div>
        </div>

        {/* Activity */}
        <div className="panel">
          <div className="panel-h">
            <div className="title"><Icon.Clock width="13" height="13"/>Activity log</div>
          </div>
          <div className="panel-body">
            {activity.map((a, i) => (
              <div key={i} className="activity-row">
                <span className={`dot ${a.kind}`}></span>
                <div>{a.text}</div>
                <div className="when">{PF.relativeTime(a.when)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="callout">
          <strong style={{ color: "var(--text)" }}>Tip · </strong>
          The G6 gate is the only thing standing between this product and a complete PDD. The next action panel updates as soon as any Phase 2 robot finishes.
        </div>
      </div>
    </div>
  );
}

function NextActionCard({ action, onTab }) {
  if (!action) return null;
  return (
    <div className="next-action">
      <div>
        <div className="label">Recommended next action</div>
        <h3>{action.label}</h3>
        <p>{action.reason}</p>
        <div className="links">
          <a onClick={() => onTab("status")}>Open {action.gate} status</a>
          {action.affects.map((a, i) => (
            <a key={i} onClick={() => onTab(a.startsWith("robot:") ? "robots" : "artifacts")}>
              {a.startsWith("robot:") ? `Open robot · ${a.replace("robot:", "")}` : `View ${a.replace(/-/g, " ")}`}
            </a>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="btn primary"><Icon.Sparkle width="12" height="12"/>Run</button>
        <button className="btn subtle sm">Dismiss</button>
      </div>
    </div>
  );
}

function GateMiniRibbon({ product, onTab }) {
  const gates = PF.gatesFor(product.slug);
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {gates.map(g => {
        const cls =
          g.status === "passed"   ? "fresh" :
          g.status === "current"  ? "current" :
          g.status === "blocked"  ? "missing" :
          g.status === "mismatch" ? "stale" : "locked";
        return (
          <div
            key={g.id}
            onClick={() => onTab("status")}
            title={`${g.id} · ${g.name} · ${g.status}`}
            style={{
              flex: 1, minWidth: 24,
              height: 26, borderRadius: 4,
              background: `var(--st-${cls === "current" ? "complete" : cls}-bg)`,
              border: `1px solid var(--st-${cls === "current" ? "complete" : cls}-line)`,
              fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 600,
              color: `var(--st-${cls === "current" ? "complete" : cls})`,
              display: "grid", placeItems: "center",
              cursor: "pointer",
              ...(g.status === "current" ? { boxShadow: "inset 0 0 0 1px var(--accent)", color: "var(--accent-ink)", background: "var(--accent-soft)", borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)" } : {})
            }}
          >
            {g.id}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── Status (G1-G8) tab ─────────────────────── */

function StatusTab({ product, onTab, onArtifact }) {
  const gates = PF.gatesFor(product.slug);
  const mismatch = gates.find(g => g.status === "mismatch");

  return (
    <div>
      {mismatch && (
        <div className="mismatch-notice" style={{ marginBottom: 16 }}>
          <span className="icon"><Icon.Diff width="14" height="14"/></span>
          <div>
            <strong>Gate / artifact mismatch detected for {mismatch.id}.</strong> {mismatch.reason}
            <div style={{ marginTop: 8 }}>
              <PathChip path="plans/autopm-productflow-strategy-presentation.html" full/>
            </div>
            <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--text-3)" }}>
              ProductFlow surfaces both facts so you can audit and continue review without blocking.
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-h">
          <div className="title"><Icon.Stack width="13" height="13"/>G1–G8 Workflow gates</div>
          <div className="right">
            <span className="status current" style={{ fontFamily: "var(--font-mono)" }}>Current: {product.currentGate}</span>
          </div>
        </div>
        <div className="panel-body flush">
          <div className="gate-list">
            {gates.map(g => (
              <GateRow key={g.id} gate={g} active={g.status === "current"}/>
            ))}
          </div>
        </div>
      </div>

      <div className="callout" style={{ marginTop: 14 }}>
        Gate state and artifact existence are tracked separately. A file can exist without a gate counting it as complete, and vice-versa — both facts are shown to keep review honest.
      </div>
    </div>
  );
}

function GateRow({ gate, active }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`gate-row ${active ? "current" : ""}`} onClick={() => setOpen(o => !o)}>
        <div className="num">{gate.id}</div>
        <div>
          <div className="label">{gate.name}</div>
          {gate.reason && <div className="reason">{gate.reason}</div>}
        </div>
        <div className="ix">
          <StatusBadge status={gate.status} label={
            gate.status === "passed" ? "Passed" :
            gate.status === "current" ? "In progress" :
            gate.status === "blocked" ? "Blocked" :
            gate.status === "mismatch" ? "Mismatch" : "Locked"
          }/>
          <Icon.ChevD width="12" height="12" style={{ color: "var(--text-4)", transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}/>
        </div>
      </div>
      {open && gate.nextAction && (
        <div style={{ padding: "0 16px 14px 58px", borderTop: "1px solid var(--line-soft)", background: "var(--surface-2)" }}>
          <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Recommended action</div>
              <div style={{ fontSize: 13 }}>{gate.nextAction}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────── Robots tab ─────────────────────────────── */

function RobotsTab({ product, onArtifact, onFreshness, view, onView, onPickEpic }) {
  const coreRuns = PF.ROBOT_RUNS[product.slug] || {};
  const phase1a = Object.entries(PF.ROBOT_META).filter(([k, v]) => v.phase === 1);
  const phase1b = Object.entries(PF.ROBOT_META).filter(([k, v]) => v.phase === 1.5);
  const phase2  = Object.entries(PF.ROBOT_META).filter(([k, v]) => v.phase === 2);

  const [expandedAsks, setExpandedAsks] = React.useState(() => {
      const askIds = Object.keys(product.asks || {});
      return askIds.reduce((acc, id) => { acc[id] = true; return acc; }, {});
  });

  const toggleAsk = (askId) => setExpandedAsks(prev => ({ ...prev, [askId]: !prev[askId] }));

  return (
    <div>
      <div className="section-h" style={{ marginBottom: 12 }}>
        <div className="seg">
          <button className={view === "table" ? "on" : ""} onClick={() => onView("table")}><Icon.List width="11" height="11" style={{ marginRight: 4, verticalAlign: -1 }}/>Table</button>
          <button className={view === "grid"  ? "on" : ""} onClick={() => onView("grid")}><Icon.Grid width="11" height="11" style={{ marginRight: 4, verticalAlign: -1 }}/>Grid</button>
        </div>
      </div>

      {/* CORE Phase 1a */}
      <div className="panel" style={{ overflow: "hidden", marginBottom: 24 }}>
        <PhaseHeader phase="1a" title="Product Core Strategy" entries={phase1a} runs={coreRuns}/>
        {view === "table"
          ? <RobotTable entries={phase1a} runs={coreRuns} onArtifact={onArtifact} onFreshness={onFreshness} productSlug={product.slug}/>
          : <RobotCards entries={phase1a} runs={coreRuns} onArtifact={onArtifact} onFreshness={onFreshness}/>}
      </div>

      {/* ASKS */}
      {Object.entries(product.asks || {}).map(([askId, askData]) => {
          // If core has no epics and no 1b robots, skip it to avoid empty panels
          const hasEpics = Object.keys(askData.epics || {}).length > 0;
          const has1bRuns = Object.values(askData.robots || {}).length > 0;
          if (askId === "core" && !hasEpics && !has1bRuns) return null;

          const isExpanded = expandedAsks[askId];
          const displayTitle = askId === "core" ? "Core Hypothesis (Legacy)" : `Ask: ${askId}`;

          return (
              <div key={askId} className="panel" style={{ overflow: "hidden", marginBottom: 24 }}>
                  <div className="phase-h row-hover" onClick={() => toggleAsk(askId)} style={{ cursor: "pointer" }}>
                      <span className="name" style={{ display: "flex", alignItems: "center" }}>
                          <span style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.1s", display: "inline-block", marginRight: 8, fontSize: 10 }}>▶</span>
                          {displayTitle}
                      </span>
                      <span className="count">
                          {Object.keys(askData.epics || {}).length} EPICS
                      </span>
                  </div>
                  
                  {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--border-light)" }}>
                          {/* Phase 1b Robots for this ask */}
                          <div style={{ background: "var(--bg-2)", padding: "12px 16px", borderBottom: "1px solid var(--border-light)", fontSize: 12, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase" }}>
                              Phase 1b — Hypothesis Definition
                          </div>
                          {view === "table"
                            ? <RobotTable entries={phase1b} runs={askData.robots || {}} onArtifact={onArtifact} onFreshness={onFreshness} productSlug={product.slug}/>
                            : <RobotCards entries={phase1b} runs={askData.robots || {}} onArtifact={onArtifact} onFreshness={onFreshness}/>}

                          {/* Epics for this ask */}
                          {Object.keys(askData.epics || {}).length > 0 && (
                            <>
                              <div style={{ background: "var(--bg-2)", padding: "12px 16px", borderBottom: "1px solid var(--border-light)", fontSize: 12, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase" }}>
                                  Phase 2 — Epics
                              </div>
                              <table className="tbl">
                                <thead>
                                  <tr>
                                    <th style={{ width: "40%" }}>Epic</th>
                                    <th style={{ width: "25%" }}>Status</th>
                                    <th>Robot Runs</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(askData.epics || {}).map(([epicId, epicData]) => {
                                    const eRuns = epicData.robots || {};
                                    const total = phase2.length;
                                    const fresh = phase2.filter(([k]) => eRuns[k]?.status === "fresh").length;
                                    const isComplete = fresh === total;
                                    const statusStr = isComplete ? "fresh" : (fresh > 0 ? "current" : "missing");
                                    return (
                                      <tr key={epicId} onClick={() => onPickEpic && onPickEpic(product.slug, epicId)} style={{ cursor: "pointer" }} className="row-hover">
                                        <td>
                                          <div style={{ fontWeight: 500, color: "var(--text-1)" }}>{epicData.name || epicId}</div>
                                          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{epicId}</div>
                                        </td>
                                        <td>
                                           <StatusBadge status={statusStr} />
                                        </td>
                                        <td style={{ color: "var(--text-3)" }}>{fresh}/{total} robots fresh</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </>
                          )}
                      </div>
                  )}
              </div>
          );
      })}
    </div>
  );
}

function PhaseHeader({ phase, title, entries, runs }) {
  const total = entries.length;
  const fresh = entries.filter(([k]) => runs[k]?.status === "fresh").length;
  return (
    <div className="phase-h">
      <span className="name">Phase {phase} — {title}</span>
      <span className="count">{fresh}/{total} fresh</span>
    </div>
  );
}

function RobotTable({ entries, runs, onArtifact, onFreshness, productSlug }) {
  const artifactsBySlug = PF.ARTIFACTS[productSlug] || [];
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th style={{ width: "28%" }}>Robot</th>
          <th>Status</th>
          <th>Last run</th>
          <th>Freshness window</th>
          <th>Artifact</th>
          <th style={{ width: 90 }}>Feedback</th>
          <th style={{ width: 28 }}></th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([k, meta]) => {
          const run = runs[k] || { status: "missing", lastRun: null };
          let artifact = null;
          if (run.assetPath) {
              const outPath = run.assetPath.endsWith(".md") && !run.assetPath.includes("-output") 
                  ? run.assetPath.replace(".md", "-output.md") 
                  : run.assetPath;
              artifact = artifactsBySlug.find(a => a.path.endsWith(outPath)) || artifactsBySlug.find(a => a.path.endsWith(run.assetPath));
          }
          return (
            <tr key={k} onClick={() => artifact ? onArtifact(artifact) : onFreshness(k, run, meta)}>
              <td>
                <div style={{ fontWeight: 500 }}>{meta.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{meta.desc}</div>
              </td>
              <td><StatusBadge status={run.status}/></td>
              <td className="mono" style={{ color: "var(--text-2)" }}>
                <div>{run.lastRun ? PF.relativeTime(run.lastRun) : "—"}</div>
                {artifact?.author && (
                  <div style={{ marginTop: 4 }}>
                    <span className="author-badge" title={`Generated by ${artifact.author}`}>
                      <Icon.User width="10" height="10"/> {artifact.author}
                    </span>
                  </div>
                )}
              </td>
              <td><span className="muted" style={{ fontSize: 12 }}>{meta.windowDays}d</span></td>
              <td>
                {run.assetPath
                  ? <PathChip path={run.assetPath}/>
                  : <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>—</span>}
              </td>
              <td>
                {run.feedback
                  ? <span style={{ fontSize: 11.5, color: "var(--accent-ink)" }}>{run.feedback.rating}/5 · {run.feedback.count}</span>
                  : <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>—</span>}
              </td>
              <td>
                <button className="iconbtn" onClick={(e) => { e.stopPropagation(); onFreshness(k, run, meta); }} aria-label="Explain freshness">
                  <Icon.Q width="12" height="12"/>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RobotCards({ entries, runs, onArtifact, onFreshness }) {
  return (
    <div className="robot-grid">
      {entries.map(([k, meta]) => {
        const run = runs[k] || { status: "missing", lastRun: null };
        return (
          <div key={k} className="robot-card" onClick={() => onFreshness(k, run, meta)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
              <div className="name">{meta.label}</div>
              <StatusBadge status={run.status}/>
            </div>
            <div className="reason">
              {run.status === "missing" ? "Not yet run — output is missing for this product." :
               run.status === "stale" ? run.staleReason || `Last run > ${meta.windowDays}d ago.` :
               run.status === "fresh" ? `Output is current. Last run ${PF.relativeTime(run.lastRun)}.` :
               run.status === "blocked" ? "Blocked by a prior gate." : ""}
            </div>
            <div className="meta">
              <span>{run.lastRun ? PF.relativeTime(run.lastRun) : "—"}</span>
              <span>{meta.windowDays}d window</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── Artifacts tab (file tree + detail) ─────────────────── */

function ArtifactsTab({ product, onArtifact, onMoney, onCopied }) {
  const arts = PF.ARTIFACTS[product.slug] || [];
  const [selectedId, setSelectedId] = useState(() =>
    arts.find(a => a.id === "art-11")?.id || arts[0]?.id
  );
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const selected = arts.find(a => a.id === selectedId);

  const tree = useMemo(() => buildTree(arts), [arts]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMouseMove = (moveEvent) => {
      setSidebarWidth(Math.max(200, Math.min(800, startWidth + (moveEvent.clientX - startX))));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [sidebarWidth]);

  return (
    <div className="artifacts-explorer" style={{ display: 'flex' }}>
      <aside className="tree-pane" style={{ width: sidebarWidth, flexShrink: 0 }}>
        <div className="tree-head">
          <div className="title">Files</div>
          <div className="tree-actions">
          </div>
        </div>
        <div className="tree-body">
          {tree.children.map(c => (
            <TreeNode key={c.path} node={c} depth={0} selectedId={selectedId} onSelect={setSelectedId} startOpen/>
          ))}
        </div>
        <div className="tree-foot">
          <span className="mono">{arts.length} files</span>
          <span>·</span>
          <span>{arts.filter(a => a.type === "markdown").length} md</span>
          <span>·</span>
          <span>{arts.filter(a => a.type === "xlsx").length} xlsx</span>
          <span>·</span>
          <span>{arts.filter(a => a.type === "pdd").length} pdd</span>
          <span>·</span>
          <span>{arts.filter(a => a.type === "presentation").length} html</span>
        </div>
      </aside>

      <div 
        className="sidebar-resizer" 
        onMouseDown={handleMouseDown} 
        style={{ width: '4px', cursor: 'col-resize', background: 'transparent', flexShrink: 0, zIndex: 10 }}
        onMouseEnter={(e) => e.target.style.background = 'var(--accent)'}
        onMouseLeave={(e) => e.target.style.background = 'transparent'}
      />

      <section className="detail-pane" style={{ flex: 1, minWidth: 0 }}>
        {selected
          ? <ArtifactDetailPane artifact={selected} product={product} onCopied={onCopied}/>
          : <EmptyDetail/>}
      </section>
    </div>
  );
}

function buildTree(arts) {
  // Build a directory tree from artifact paths. Sort: dirs first, then files alpha.
  const root = { name: "", path: "", isDir: true, children: {} };
  for (const a of arts) {
    const p = a.logicalPath || a.path;
    const parts = p.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const dirPath = parts.slice(0, i + 1).join("/");
      if (!node.children[p]) node.children[p] = { name: p, path: dirPath, isDir: true, children: {} };
      node = node.children[p];
    }
    const fileName = parts[parts.length - 1];
    node.children[fileName] = { name: fileName, path: a.path, isDir: false, artifact: a };
  }
  // Convert children objects to sorted arrays recursively
  const sortNode = (node) => {
    if (!node.isDir) return node;
    const kids = Object.values(node.children).map(sortNode);
    kids.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { ...node, children: kids };
  };
  return sortNode(root);
}

function TreeNode({ node, depth, selectedId, onSelect, startOpen = false }) {
  const [open, setOpen] = useState(startOpen || depth < 2);

  if (!node.isDir) {
    const a = node.artifact;
    const selected = selectedId === a.id;
    const stale = a.id === "art-3" || a.id === "art-13";
    return (
      <div
        className={`tree-row file ${selected ? "selected" : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelect(a.id)}
        tabIndex="0"
        onKeyDown={(e) => e.key === "Enter" && onSelect(a.id)}
      >
        <span className="tree-icon">
          {a.type === "xlsx" ? <Icon.Xlsx width="13" height="13" style={{ color: "#3F6A2A" }}/> :
           a.type === "pdd"  ? <Icon.Stack width="13" height="13" style={{ color: "#7A5C2A" }}/> :
           a.type === "presentation" ? <Icon.Workbook width="13" height="13" style={{ color: "#3B5485" }}/> :
           <Icon.Doc width="13" height="13" style={{ color: "var(--text-3)" }}/>}
        </span>
        <span className="tree-label">{node.name}</span>
        <span className="tree-meta">
          {stale && <span className="dot stale" title="Stale"></span>}
          {a.mismatch && <span className="dot mismatch" title="Gate mismatch"></span>}
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        className="tree-row dir"
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="tree-chev" style={{ transform: open ? "rotate(90deg)" : "none" }}>
          <Icon.ChevR width="11" height="11"/>
        </span>
        <span className="tree-icon">
          <Icon.Folder width="13" height="13" style={{ color: "var(--text-2)" }}/>
        </span>
        <span className="tree-label">{node.name}</span>
        <span className="tree-meta mono">{node.children.length}</span>
      </div>
      {open && node.children.map(c => (
        <TreeNode key={c.path} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect}/>
      ))}
    </>
  );
}

function EmptyDetail() {
  return (
    <div className="empty" style={{ height: "100%" }}>
      <div className="icon-bubble"><Icon.Doc width="16" height="16"/></div>
      <h3>Pick a file</h3>
      <p>Select an artifact from the tree to preview it here. Markdown, workbooks, the PDD draft, and the presentation are all browsable.</p>
    </div>
  );
}

function ArtifactDetailPane({ artifact, product, onCopied }) {
  const meta = PF.ROBOT_META[artifact.robot];
  const run = (PF.ROBOT_RUNS[product.slug] || {})[artifact.robot];
  const status = run?.status || (artifact.mismatch ? "mismatch" : "fresh");

  const [mdText, setMdText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  // Dynamically resolve the latest feedback from live event stream or seed
  const getFeedbackForArtifact = () => {
    const liveFb = (PF.FEEDBACK_EVENTS || []).filter(f => 
      f.productSlug === product.slug && f.robot === artifact.robot
    );
    if (liveFb.length > 0) {
      const sorted = [...liveFb].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      return sorted[0];
    }
    return PF.FEEDBACK_SEED?.[artifact.id] || null;
  };

  const seed = getFeedbackForArtifact();
  const [submittedAt, setSubmittedAt] = useState(seed?.at || null);
  const [feedbackBuffer, setFeedbackBuffer] = useState(seed || null);

  useEffect(() => {
      setMdText("");
      if (artifact.type === "markdown" || artifact.type === "pdd") {
          fetch(`/api/artifact?path=${encodeURIComponent(artifact.path)}`)
            .then(r => r.text())
            .then(t => setMdText(t));
      }
  }, [artifact.path, artifact.type]);

  useEffect(() => {
    setShowFeedback(false);
    const newSeed = getFeedbackForArtifact();
    setSubmittedAt(newSeed?.at || null);
    setFeedbackBuffer(newSeed || null);
  }, [artifact.id]);

  const FeedbackPanel = window.FeedbackPanel;

  // Check if a companion rich HTML file exists for this markdown report
  const companionHtml = (PF.ARTIFACTS[product.slug] || []).find(a => 
    a.robot === artifact.robot && 
    a.type === "html" && 
    a.filename.replace(".html", "") === artifact.filename.replace(".md", "")
  );
  const hasHtmlContent = artifact.type === "html" || companionHtml;

  return (
    <div className="detail-inner">
      <div className="detail-head">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            {artifact.type.toUpperCase()}
            <span style={{ color: "var(--text-4)", margin: "0 6px" }}>·</span>
            {meta?.label || artifact.robot}
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-0.005em" }}>{artifact.title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <StatusBadge status={status === "mismatch" ? "mismatch" : status} label={
              status === "mismatch" ? "Gate mismatch" :
              status === "fresh" ? "Fresh" :
              status === "stale" ? "Stale" :
              status === "missing" ? "Missing" : status
            }/>
            <span style={{ fontSize: 11.5, color: "var(--text-3)", whiteSpace: "nowrap" }}>
              Generated {PF.formatDate(artifact.generated)} · {artifact.size}
            </span>
            {artifact.author && (
              <span className="author-badge" title={`Generated by ${artifact.author}`}>
                <Icon.User width="10" height="10"/> {artifact.author}
              </span>
            )}
            <PathChip path={artifact.path}/>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {artifact.type === "markdown" && (
            <button 
              className={`btn ${showFeedback ? "primary" : ""}`} 
              onClick={() => setShowFeedback(s => !s)}
            >
              <Icon.Sparkle width="12" height="12"/>
              {submittedAt ? "Edit feedback" : "Feedback"}
            </button>
          )}
        </div>
      </div>

      {artifact.mismatch && (
        <div className="mismatch-notice" style={{ margin: "12px 18px 0" }}>
          <span className="icon"><Icon.Diff width="14" height="14"/></span>
          <div>
            <strong>Outside the expected gate path.</strong> {PF.name || "ProductFlow"}'s G8 bookkeeping expects presentation files under
            <code className="mono" style={{ margin: "0 4px" }}>products/{product.slug}/assets/</code>
            but this one lives in
            <code className="mono" style={{ margin: "0 4px" }}>plans/</code>.
            Review continues; gate state stays out of sync until the file is moved or re-generated.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div className="detail-body" style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: (hasHtmlContent || window.EPIC_VIEWERS?.[artifact.robot]) ? 0 : "20px 24px 40px",
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }}>
          {artifact.type === "markdown" && !window.EPIC_VIEWERS?.[artifact.robot] && (
            companionHtml ? (
              <iframe src={`/api/artifact?path=${encodeURIComponent(companionHtml.path)}`} style={{ flex: 1, width: "100%", border: "none" }} title={artifact.title} />
            ) : (
              <MarkdownView source={mdText}/>
            )
          )}
          {window.EPIC_VIEWERS?.[artifact.robot] && artifact.type !== "html" && (
            React.createElement(window.EPIC_VIEWERS[artifact.robot], { artifact })
          )}
          {artifact.type === "xlsx" && (
            <XlsxPreview artifact={artifact}/>
          )}
          {artifact.type === "pdd" && (
            <>
              <PddPreview artifact={artifact}/>
              <div style={{ padding: "0 24px 24px" }}>
                <MarkdownView source={mdText}/>
              </div>
            </>
          )}
          {artifact.type === "presentation" && (
            <PresentationPreview artifact={artifact}/>
          )}
          {artifact.type === "html" && (
            <iframe src={`/api/artifact?path=${encodeURIComponent(artifact.path)}`} style={{ width: "100%", height: "100%", border: "none" }} title={artifact.title} />
          )}
        </div>

        {showFeedback && FeedbackPanel && (
          <div style={{ width: 340, borderLeft: "1px solid var(--line-soft)", overflowY: "auto", background: "var(--surface)", position: "sticky", top: 0, height: "100%", zIndex: 10 }}>
            <FeedbackPanel
              artifact={artifact}
              product={product}
              initial={feedbackBuffer}
              onSubmit={(fb) => {
                setFeedbackBuffer(fb);
                setSubmittedAt(new Date().toISOString());
                onCopied("Feedback saved to ProductFlow");
              }}
              onClose={() => setShowFeedback(false)}
              submittedAt={submittedAt}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function XlsxPreview({ artifact }) {
  // Mocked workbook structure for a financial model
  const sheets = [
    { name: "Assumptions",   cells: 42 },
    { name: "Revenue Model", cells: 168 },
    { name: "Cost Stack",    cells: 96 },
    { name: "Scenarios",     cells: 124 },
    { name: "Charts",        cells: 0 }
  ];
  return (
    <div>
      <div className="money-card" style={{ marginBottom: 18 }}>
        <div className="xlsx-bubble">XLSX</div>
        <div>
          <div className="name">{artifact.filename}</div>
          <div className="meta">{artifact.size} · Editable in Excel · Generated {PF.formatDate(artifact.generated)}</div>
          <div style={{ marginTop: 8 }}><PathChip path={artifact.path} full/></div>
        </div>
        <div style={{ display: "flex" }}>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Sheets detected</div>
      <div className="panel" style={{ marginTop: 0 }}>
        <table className="tbl">
          <thead><tr><th>Sheet</th><th>Cells</th><th></th></tr></thead>
          <tbody>
            {sheets.map(s => (
              <tr key={s.name}>
                <td><span className="mono" style={{ color: "var(--text-1)" }}>{s.name}</span></td>
                <td className="mono" style={{ color: "var(--text-3)" }}>{s.cells || "—"}</td>
                <td><span style={{ fontSize: 11.5, color: "var(--text-3)" }}>preview not rendered</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="callout" style={{ marginTop: 14 }}>
        <strong style={{ color: "var(--text)" }}>v1 scope · </strong>
        ProductFlow recognizes the workbook as a first-class artifact but doesn't render formulas. Open in Excel or Google Sheets to edit; rendering may arrive in Wave 2.
      </div>
    </div>
  );
}

function PddPreview({ artifact }) {
  const sections = [
    { name: "Feature Overview & Executive Summary", complete: true },
    { name: "Scope and Specifications", complete: true },
    { name: "User Stories", complete: true },
    { name: "Customer Journeys", complete: false, missing: "customer-journeys robot" },
    { name: "Technical Feasibility", complete: true },
    { name: "Design Feasibility", complete: true },
    { name: "Competitor Analysis", complete: true },
    { name: "Roadmap & Timeline", complete: true },
    { name: "Data Privacy", complete: false, missing: "data-privacy robot" },
    { name: "GTM Readiness", complete: true },
    { name: "Risks Registry", complete: true, note: "stale" },
    { name: "Success Metrics & KPIs", complete: false, missing: "kpis robot" },
    { name: "DACI & Stakeholders", complete: false, missing: "daci-stakeholders robot" }
  ];
  const filled = sections.filter(s => s.complete).length;

  return (
    <div>
      <div className="callout warn" style={{ marginBottom: 14 }}>
        <strong style={{ color: "var(--text)" }}>Draft · </strong>
        {filled} of {sections.length} sections drafted. The PDD assembles automatically as Phase 2 robots complete. 4 sections still cite missing Phase 2 robots.
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Section status</div>
      <div className="panel">
        <table className="tbl">
          <tbody>
            {sections.map((s, i) => (
              <tr key={i}>
                <td style={{ width: 32 }}>
                  {s.complete
                    ? <Icon.Check width="13" height="13" style={{ color: "var(--st-fresh)" }}/>
                    : <Icon.Alert width="13" height="13" style={{ color: "var(--st-missing)" }}/>}
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.name}</div>
                  {s.missing && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Awaits: {s.missing}</div>}
                </td>
                <td>
                  {s.complete
                    ? (s.note ? <StatusBadge status="stale"/> : <StatusBadge status="fresh" label="Drafted"/>)
                    : <StatusBadge status="missing"/>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PresentationPreview({ artifact }) {
  return (
    <div>
      <div className="money-card" style={{ marginBottom: 18 }}>
        <div className="xlsx-bubble" style={{ background: "linear-gradient(180deg, #DCE3F0, #B9C5DE)", borderColor: "#9BABC8", color: "#3B5485" }}>HTML</div>
        <div>
          <div className="name">{artifact.filename}</div>
          <div className="meta">{artifact.size} · Stakeholder strategy deck · Generated {PF.formatDate(artifact.generated)}</div>
          <div style={{ marginTop: 8 }}><PathChip path={artifact.path} full/></div>
        </div>
        <div style={{ display: "flex" }}>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 8 }}>Deck overview</div>
      <div className="two-up">
        {[
          "Title — AutoPM / ProductFlow Strategy",
          "Problem — PM artifacts are hidden",
          "Approach — Gated robot method",
          "Phase 1 outputs",
          "Phase 2 outputs",
          "Market & Competitive",
          "Financial model summary",
          "Roadmap & waves",
          "GTM plan",
          "Risks & mitigations",
          "Next 90 days",
          "Appendix · Source artifacts"
        ].map((title, i) => (
          <div key={i} style={{ padding: "10px 12px", border: "1px solid var(--line)", background: "var(--surface)", borderRadius: "var(--radius-1)", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--text-3)", width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ fontSize: 12.5 }}>{title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── Context tab ─────────────────────────── */

function ContextTab({ product }) {
  const items = PF.CONTEXT[product.slug] || [];
  const [open, setOpen] = useState(null);

  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="icon-bubble"><Icon.Folder width="16" height="16"/></div>
        <h3>No context yet</h3>
        <p>ProductFlow supports notes, URLs, documents, analyst reports, research, surveys, and experiment feedback. Add files under <code className="mono">context/</code>.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-h">
        <h2>Evidence & background</h2>
        <span className="count">{items.length} entries</span>
      </div>
      <div className="context-list">
        {items.map(c => (
          <div key={c.id}>
            <div className="context-row" onClick={() => setOpen(o => o === c.id ? null : c.id)}>
              <div><span className="type-pill">{PF.CONTEXT_TYPE_LABEL[c.type]}</span></div>
              <div style={{ minWidth: 0 }}>
                <div className="title">{c.title}</div>
                <div className="src">{c.source} · {c.size}</div>
                {open === c.id && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)", fontSize: 12.5, color: "var(--text-1)", lineHeight: 1.55 }}>
                    {c.excerpt}
                    <div style={{ marginTop: 8 }}><PathChip path={c.path} full/></div>
                  </div>
                )}
              </div>
              <div className="when">{PF.relativeTime(c.date)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EpicDashboard({ product, epicId, tab, onTab, onArtifact, onFreshness, view, onView, onCopied }) {
  let epic = { robots: {} };
  for (const ask of Object.values(product.asks || {})) {
    if (ask.epics && ask.epics[epicId]) {
      epic = ask.epics[epicId];
      break;
    }
  }
  const runs = epic.robots;
  const phase2 = Object.entries(PF.ROBOT_META).filter(([k, v]) => v.phase === 2);

  return (
    <div className="content-inner">
      <div className="page-h">
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Epic · {product.name}</div>
          <h1>{epicId}</h1>
        </div>
      </div>
      
      <div className="section-h" style={{ marginBottom: 12 }}>
        <div className="seg">
          <button className={view === "table" ? "on" : ""} onClick={() => onView("table")}><Icon.List width="11" height="11" style={{ marginRight: 4, verticalAlign: -1 }}/>Table</button>
          <button className={view === "grid"  ? "on" : ""} onClick={() => onView("grid")}><Icon.Grid width="11" height="11" style={{ marginRight: 4, verticalAlign: -1 }}/>Grid</button>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        <PhaseHeader phase={2} entries={phase2} runs={runs}/>
        {view === "table"
          ? <RobotTable entries={phase2} runs={runs} onArtifact={onArtifact} onFreshness={onFreshness} productSlug={product.slug}/>
          : <RobotCards entries={phase2} runs={runs} onArtifact={onArtifact} onFreshness={onFreshness}/>}
      </div>
    </div>
  );
}

Object.assign(window, {
  WorkspaceCheck, ProductIndex, ProductHome, EpicDashboard, OverviewTab, StatusTab,
  RobotsTab, ArtifactsTab, ContextTab, RollupRow, NextActionCard,
  TreeNode, ArtifactDetailPane, XlsxPreview, PddPreview, PresentationPreview
});
