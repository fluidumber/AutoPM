/* eslint-disable */
/* App shell: rail, topbar, route state, Tweaks integration */

const PFA = window.PFData;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "accent": "sage",
  "robotView": "table",
  "showPaths": true,
  "startScreen": "home"
}/*EDITMODE-END*/;

function App() {
  // Route state: { screen: 'workspace' | 'index' | 'home' | 'artifact' | 'money', productSlug, tab, artifactId }
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Apply density + accent + path visibility to root
  useEffect(() => {
    document.documentElement.setAttribute("data-density", tweaks.density === "compact" ? "compact" : "comfortable");
    document.documentElement.setAttribute("data-accent", tweaks.accent);
    document.documentElement.style.setProperty("--path-display", tweaks.showPaths ? "inline-flex" : "none");
  }, [tweaks.density, tweaks.accent, tweaks.showPaths]);

  // Initial screen
  const [route, setRoute] = useState(() => {
    if (tweaks.startScreen === "workspace") return { screen: "workspace" };
    if (tweaks.startScreen === "index") return { screen: "index" };
    return { screen: "home", productSlug: "autopm-productflow", epicId: null, tab: "overview" };
  });
  const [freshnessData, setFreshnessData] = useState(null);
  const toast = useToast();

  const product = useMemo(
    () => PFA.PRODUCTS.find(p => p.slug === route.productSlug),
    [route.productSlug]
  );

  // Top-of-window arrow keys
  useKey({
    "Escape": () => {
      if (freshnessData) setFreshnessData(null);
      else if (route.screen === "artifact" || route.screen === "money") goHome();
    }
  });

  function openProduct(slug) {
    setRoute({ screen: "home", productSlug: slug, epicId: null, tab: "overview" });
  }
  function openEpic(slug, epicId) {
    setRoute({ screen: "home", productSlug: slug, epicId: epicId, tab: "overview" });
  }
  function goHome() {
    setRoute(r => ({ screen: "home", productSlug: r.productSlug, epicId: r.epicId, tab: r.tab || "overview" }));
  }
  function goProductHome() {
    setRoute(r => ({ screen: "home", productSlug: r.productSlug, epicId: null, tab: "overview" }));
  }
  function goEpicHome() {
    setRoute(r => ({ screen: "home", productSlug: r.productSlug, epicId: r.epicId, tab: "overview" }));
  }
  function openArtifact(art) {
    setRoute(r => ({ screen: "artifact", productSlug: r.productSlug, epicId: r.epicId, tab: r.tab, artifactId: art.id }));
  }
  function openMoney(art) {
    setRoute(r => ({ screen: "money", productSlug: r.productSlug, epicId: r.epicId, tab: r.tab, artifactId: art.id }));
  }
  function openFreshness(robotKey, run, meta) {
    setFreshnessData({ robotKey, run, meta, productSlug: route.productSlug, epicId: route.epicId });
  }
  function setTab(tab) {
    setRoute(r => ({ ...r, screen: "home", tab }));
  }
  function setRobotView(v) {
    setTweak("robotView", v);
  }

  const onCopied = (msg) => toast.show(msg || "Copied path");

  const currentArtifact = useMemo(() => {
    if (!route.artifactId || !product) return null;
    return (PFA.ARTIFACTS[product.slug] || []).find(a => a.id === route.artifactId);
  }, [route, product]);

  return (
    <div className="app" data-screen-label={`ProductFlow · ${route.screen}`}>
      <Rail
        currentSlug={route.productSlug}
        currentEpicId={route.epicId}
        currentScreen={route.screen}
        onPickProduct={openProduct}
        onPickEpic={openEpic}
        onWorkspace={() => setRoute({ screen: "workspace" })}
        onIndex={() => setRoute({ screen: "index" })}
        onFeedback={() => setRoute({ screen: "feedback" })}
        onPolicy={() => setRoute({ screen: "policy" })}
      />

      <main className="main">
        <TopBar route={route} product={product} artifact={currentArtifact} onBack={goHome} onProductHome={goProductHome} onEpicHome={goEpicHome} onIndex={() => setRoute({ screen: "index" })}/>
        <div className="content">
          {route.screen === "workspace" && (
            <WorkspaceCheck onContinue={() => setRoute({ screen: "index" })}/>
          )}
          {route.screen === "index" && (
            <ProductIndex onOpen={openProduct}/>
          )}
          {route.screen === "home" && product && !route.epicId && (
            <ProductHome
              product={product}
              tab={route.tab}
              onTab={setTab}
              onArtifact={openArtifact}
              onMoney={openMoney}
              onFreshness={openFreshness}
              view={tweaks.robotView}
              onView={setRobotView}
              onCopied={onCopied}
              onPickEpic={openEpic}
            />
          )}
          {route.screen === "home" && product && route.epicId && (
            <EpicDashboard
              product={product}
              epicId={route.epicId}
              tab={route.tab}
              onTab={setTab}
              onArtifact={openArtifact}
              onFreshness={openFreshness}
              view={tweaks.robotView}
              onView={setRobotView}
              onCopied={onCopied}
            />
          )}
          {route.screen === "artifact" && currentArtifact && product && (
            <ArtifactViewer
              artifact={currentArtifact}
              product={product}
              onBack={goHome}
              onCopied={onCopied}
            />
          )}
          {route.screen === "money" && currentArtifact && product && (
            <MoneyDetail artifact={currentArtifact} product={product} onBack={goHome} onCopied={onCopied}/>
          )}
          {route.screen === "feedback" && (
            <FeedbackInbox
              onProduct={(slug) => setRoute({ screen: "home", productSlug: slug, tab: "overview" })}
              onArtifact={(slug, artifactId) => setRoute({ screen: "artifact", productSlug: slug, tab: "artifacts", artifactId })}
            />
          )}
          {route.screen === "policy" && (
            <StalenessPolicy/>
          )}
        </div>
      </main>

      <FreshnessDrawer
        data={freshnessData}
        onClose={() => setFreshnessData(null)}
        onOpenArtifact={(robotKey) => {
          const arts = PFA.ARTIFACTS[route.productSlug] || [];
          const art = arts.find(a => a.robot === robotKey && a.type === "markdown");
          if (art) {
            setFreshnessData(null);
            setRoute(r => ({ screen: "artifact", productSlug: r.productSlug, tab: r.tab, artifactId: art.id }));
          }
        }}
      />

      <Toast message={toast.msg} on={toast.on}/>

      <TweaksPanelOverlay tweaks={tweaks} setTweak={setTweak}/>
    </div>
  );
}

/* ─────────────────────────── Rail ─────────────────────────── */

function Rail({ currentSlug, currentEpicId, currentScreen, onPickProduct, onPickEpic, onWorkspace, onIndex, onFeedback, onPolicy }) {
  return (
    <aside className="rail">
      <div className="rail-head">
        <div className="brand">
          <div className="brand-mark">PF</div>
          <span>ProductFlow</span>
          <span style={{ fontSize: 10, padding: "2px 5px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 3, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>v3.0</span>
        </div>
        <button className="workspace-pill" onClick={onWorkspace} aria-label="Workspace details">
          <span className="dot"></span>
          <span className="path">{PFA.WORKSPACE.root}</span>
          <Icon.ChevR width="11" height="11" style={{ color: "var(--text-3)", flexShrink: 0 }}/>
        </button>
      </div>

      <div className="rail-section">
        <span>Products</span>
        <div className="rail-section-actions">
          <button onClick={onIndex}>All</button>
        </div>
      </div>
      <div className="rail-list">
        {PFA.PRODUCTS.map(p => (
          <React.Fragment key={p.slug}>
            <div
              className={`rail-item ${currentSlug === p.slug && !currentEpicId && !["index", "workspace", "feedback", "policy"].includes(currentScreen) ? "active" : ""}`}
              onClick={() => onPickProduct(p.slug)}
              tabIndex="0"
              onKeyDown={(e) => e.key === "Enter" && onPickProduct(p.slug)}
            >
              <div style={{ minWidth: 0 }}>
                <div className="name">{p.name}</div>
                <div className="meta">{p.currentGate} · {p.rollups.fresh}/{p.rollups.fresh + p.rollups.stale + p.rollups.missing}</div>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {p.rollups.missing > 0 && <span className="status missing" style={{ height: 16, padding: "0 5px", fontSize: 10, gap: 3 }}><span className="icon"><Icon.Dot width="6" height="6"/></span>{p.rollups.missing}</span>}
                {p.rollups.stale > 0   && <span className="status stale"   style={{ height: 16, padding: "0 5px", fontSize: 10, gap: 3 }}><span className="icon"><Icon.Dot width="6" height="6"/></span>{p.rollups.stale}</span>}
              </div>
            </div>
            {currentSlug === p.slug && p.epics && Object.keys(p.epics).length > 0 && (
              <div className="rail-sublist" style={{ paddingLeft: 16, borderLeft: "1px solid var(--line)", marginLeft: 20, marginTop: -4, marginBottom: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                {Object.keys(p.epics).map(epicId => (
                  <div
                    key={epicId}
                    className={`rail-item ${currentEpicId === epicId ? "active" : ""}`}
                    onClick={() => onPickEpic(p.slug, epicId)}
                    style={{ padding: "6px 10px", minHeight: 28 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="name" style={{ fontSize: 12 }}>{epicId}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="rail-section">
        <span>System</span>
      </div>
      <div className="rail-list">
        <div className={`rail-item ${currentScreen === "workspace" ? "active" : ""}`} onClick={onWorkspace}>
          <div><div className="name" style={{ fontSize: 12.5 }}>Workspace check</div></div>
        </div>
        <div className={`rail-item ${currentScreen === "feedback" ? "active" : ""}`} onClick={onFeedback}>
          <div><div className="name" style={{ fontSize: 12.5 }}>Feedback inbox</div></div>
          <div className="meta">{PFA.FEEDBACK_EVENTS.length}</div>
        </div>
        <div className={`rail-item ${currentScreen === "policy" ? "active" : ""}`} onClick={onPolicy}>
          <div><div className="name" style={{ fontSize: 12.5 }}>Staleness policy</div></div>
        </div>
      </div>

      <div className="rail-foot">
        <ConnectionPill/>
        <span style={{ fontFamily: "var(--font-mono)" }}>{PFA.WORKSPACE.activePersona?.slug || "—"}</span>
      </div>
    </aside>
  );
}

/* ─────────────────────────── TopBar ───────────────────────── */

function TopBar({ route, product, artifact, onBack, onProductHome, onEpicHome, onIndex }) {
  const isSystem = route.screen === "workspace" || route.screen === "feedback" || route.screen === "policy";
  return (
    <div className="topbar">
      <div className="crumbs">
        {isSystem ? (
          <>
            <span className="crumb" style={{ pointerEvents: "none" }}><Icon.Settings width="12" height="12" style={{ marginRight: 5, color: "var(--text-3)", verticalAlign: -2 }}/>System</span>
            <span className="sep">/</span>
            <span className="crumb current">
              {route.screen === "workspace" && "Workspace check"}
              {route.screen === "feedback"  && "Feedback inbox"}
              {route.screen === "policy"    && "Staleness policy"}
            </span>
          </>
        ) : (
          <>
            <span className="crumb" onClick={onIndex}><Icon.Folder width="12" height="12" style={{ marginRight: 5, color: "var(--text-3)", verticalAlign: -2 }}/>Products</span>
            {route.screen === "index" && (
              <span className="crumb current" style={{ marginLeft: 0 }}> · {PFA.PRODUCTS.length} products</span>
            )}
            {product && route.screen !== "index" && (
              <>
                <span className="sep">/</span>
                <span className={`crumb ${route.screen === "home" && !route.epicId && (!route.tab || route.tab === "overview") ? "current" : ""}`} onClick={onProductHome || onBack}>{product.name}</span>
              </>
            )}
            {product && route.epicId && route.screen !== "index" && (
              <>
                <span className="sep">/</span>
                <span className={`crumb ${route.screen === "home" && (!route.tab || route.tab === "overview") ? "current" : ""}`} onClick={onEpicHome || onBack}>{route.epicId}</span>
              </>
            )}
            {route.screen === "home" && route.tab && route.tab !== "overview" && (
              <>
                <span className="sep">/</span>
                <span className="crumb current">{({status:"Status", robots:"Robots", artifacts:"Artifacts", context:"Context"})[route.tab]}</span>
              </>
            )}
            {route.screen === "artifact" && artifact && (
              <>
                <span className="sep">/</span>
                <span className="crumb" onClick={route.epicId ? (onEpicHome || onBack) : (onProductHome || onBack)}>Artifacts</span>
                <span className="sep">/</span>
                <span className="crumb current">{artifact.title}</span>
              </>
            )}
            {route.screen === "money" && artifact && (
              <>
                <span className="sep">/</span>
                <span className="crumb" onClick={route.epicId ? (onEpicHome || onBack) : (onProductHome || onBack)}>Artifacts</span>
                <span className="sep">/</span>
                <span className="crumb current">Money workbook</span>
              </>
            )}
          </>
        )}
      </div>

      <div className="topbar-spacer"></div>
    </div>
  );
}

/* ─────────────── Connection pill (live / mock) ──────────────── */

function ConnectionPill() {
  const source  = window.PFData.__source || "mock";
  const apiBase = window.PFData.__apiBase || "";
  const error   = window.PFData.__error;
  const binding = (PFA.WORKSPACE && PFA.WORKSPACE.binding) || "—";

  if (source === "live") {
    return (
      <span className="pulse" title={`Live data from ${apiBase}`}>
        <span className="dot"></span>
        API · {binding}
      </span>
    );
  }
  return (
    <span
      className="pulse mock"
      title={`No HTTP server reachable at ${apiBase}${error ? ` (${error})` : ""}. Showing mock data — start the server with: npm run http`}
    >
      <span className="dot"></span>
      mock data
    </span>
  );
}

/* ─────────────── Tweaks Panel ─────────────── */

function TweaksPanelOverlay({ tweaks, setTweak }) {
  const ACCENTS = {
    "#4B6A4F": "sage",
    "#2F6868": "teal",
    "#475572": "slate",
    "#8A6B23": "ochre"
  };
  const accentHex = Object.entries(ACCENTS).find(([_, v]) => v === tweaks.accent)?.[0] || "#4B6A4F";

  return (
    <window.TweaksPanel title="Cockpit tweaks">
      <window.TweakSection label="Display">
        <window.TweakRadio
          label="Density"
          value={tweaks.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "comfortable", label: "Comfy" },
            { value: "compact",     label: "Compact" }
          ]}
        />
        <window.TweakColor
          label="Accent"
          value={accentHex}
          onChange={(hex) => setTweak("accent", ACCENTS[hex] || "sage")}
          options={Object.keys(ACCENTS)}
        />
      </window.TweakSection>

      <window.TweakSection label="Robot grid">
        <window.TweakRadio
          label="View"
          value={tweaks.robotView}
          onChange={(v) => setTweak("robotView", v)}
          options={[
            { value: "table", label: "Table" },
            { value: "grid",  label: "Cards" }
          ]}
        />
      </window.TweakSection>

      <window.TweakSection label="Local paths">
        <window.TweakToggle
          label="Show file paths inline"
          value={tweaks.showPaths}
          onChange={(v) => setTweak("showPaths", v)}
        />
      </window.TweakSection>

      <window.TweakSection label="Start screen">
        <window.TweakRadio
          label="Land on"
          value={tweaks.startScreen}
          onChange={(v) => setTweak("startScreen", v)}
          options={[
            { value: "workspace", label: "Check" },
            { value: "index",     label: "Index" },
            { value: "home",      label: "Home" }
          ]}
        />
      </window.TweakSection>
    </window.TweaksPanel>
  );
}

/* Hide path chips if the tweak says so */
function applyPathVisibility(show) {
  document.documentElement.style.setProperty("--path-display", show ? "inline-flex" : "none");
}
const _styleEl = document.createElement("style");
_styleEl.textContent = `.path-chip { display: var(--path-display, inline-flex); }`;
document.head.appendChild(_styleEl);

window.App = App;

/* Wait for the API boot probe to resolve (live or mock) before mounting,
   so the first render is consistent. Times out at 1.5s inside api.js. */
(window.PFBoot?.ready || Promise.resolve()).then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
});
