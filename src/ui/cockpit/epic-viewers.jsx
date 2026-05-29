/* Epic Viewers — Native React UI for Phase 2 Robots */
const { useState, useEffect, useRef } = React;

function Mermaid({ chart }) {
  const ref = useRef(null);
  
  useEffect(() => {
    if (chart && window.mermaid) {
      window.mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
      const id = 'mermaid-svg-' + Math.random().toString(36).substr(2, 9);
      try {
        window.mermaid.render(id, chart).then(({ svg }) => {
          if (ref.current) ref.current.innerHTML = svg;
        }).catch(err => {
          console.error('Mermaid render error', err);
          if (ref.current) ref.current.innerHTML = `<div style="color:red; padding:12px; border:1px solid red; font-size: 13px; font-family: monospace;">Mermaid syntax error</div>`;
        });
      } catch (err) {
        console.error('Mermaid exception', err);
      }
    }
  }, [chart]);

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', padding: 24, background: 'white', borderRadius: 'var(--radius-2)', border: '1px solid var(--line-soft)', overflowX: 'auto', minHeight: 100 }} />;
}

function useJsonArtifact(artifact) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/artifact?path=${encodeURIComponent(artifact.path)}`)
      .then(res => res.text())
      .then(text => {
        try {
          let jsonStr = text;
          if (jsonStr.startsWith("```json")) {
             jsonStr = jsonStr.replace(/^```json\n/, "").replace(/\n```$/, "");
          }
          setData(JSON.parse(jsonStr));
        } catch (e) {
          console.error("Failed to parse json", e);
        }
      });
  }, [artifact.path]);
  return data;
}

function normaliseSynthesis(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === "string") return item;
        if (item?.signal && item?.detail) return `${item.signal}: ${item.detail}`;
        return item?.text || item?.detail || item?.signal || "";
      })
      .map(item => item.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(/\n|•/)
    .map(item => item.trim())
    .filter(Boolean);
}

function SynthesisList({ value }) {
  const items = normaliseSynthesis(value);
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 8, maxWidth: 720 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Synthesis</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-3)", fontSize: 13, lineHeight: 1.45 }}>
        {items.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
      </ul>
    </div>
  );
}

function UserStoriesViewer({ artifact }) {
  const [state, setState] = useState({ loading: true, data: null, raw: "", parseError: null });
  const [selectedStories, setSelectedStories] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, raw: "", parseError: null });

    fetch(`/api/artifact?path=${encodeURIComponent(artifact.path)}`)
      .then(res => res.text())
      .then(text => {
        if (cancelled) return;
        let jsonStr = text.trim();
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        }

        try {
          setState({ loading: false, data: JSON.parse(jsonStr), raw: text, parseError: null });
        } catch (e) {
          setState({ loading: false, data: null, raw: text, parseError: e.message });
        }
      })
      .catch(e => {
        if (!cancelled) setState({ loading: false, data: null, raw: "", parseError: e.message });
      });

    return () => { cancelled = true; };
  }, [artifact.path]);

  if (state.loading) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!state.data) {
    return (
      <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
        {state.parseError && (
          <div style={{ marginBottom: 16, padding: 12, border: "1px solid var(--line)", borderRadius: "var(--radius-1)", background: "var(--surface-2)", color: "var(--text-2)", fontSize: 13 }}>
            Showing this user-stories artifact as Markdown. The structured experiment selector is available only for JSON-formatted user-stories outputs.
          </div>
        )}
        <MarkdownView source={state.raw || "No artifact body returned."}/>
      </div>
    );
  }

  const data = state.data;
  const storyGroups = normaliseUserStoryGroups(data);

  const handleToggle = (storyId) => {
    const next = new Set(selectedStories);
    if (next.has(storyId)) next.delete(storyId);
    else next.add(storyId);
    setSelectedStories(next);
  };

  const handleLockScope = () => {
    fetch('/api/select-experiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         type: "experiment",
         id: "lock-scope",
         title: "Locked Scope",
         description: "Selected user stories",
         stories: Array.from(selectedStories)
      })
    })
    .then(() => alert("Scope locked successfully!"))
    .catch((err) => {
       console.error(err);
       alert("Failed to lock scope.");
    });
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>User Stories</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
        <button onClick={handleLockScope} className="btn primary" disabled={selectedStories.size === 0}>
          <Icon.Check width="12" height="12"/> Lock Scope ({selectedStories.size})
        </button>
      </div>

      {storyGroups.map((personaCluster, i) => (
        <div key={i} style={{ marginBottom: 32 }}>
           <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>{personaCluster.persona}</h3>
           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
             {personaCluster.stories.map((s, j) => {
               const id = s.id || `${personaCluster.persona}-${j}`;
               return (
                 <label key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)", background: "white", cursor: "pointer" }}>
                   <input type="checkbox" checked={selectedStories.has(id)} onChange={() => handleToggle(id)} style={{ marginTop: 4 }}/>
                   <div>
                     <div style={{ fontWeight: 500 }}>{s.story || `${s.asA || ""} I want to ${s.iWantTo || ""} so that ${s.soThat || ""}`}</div>
                     {s.description && <div style={{ marginTop: 6, color: "var(--text-2)", fontSize: 13 }}>{s.description}</div>}
                     {s.acceptanceCriteria && (
                       <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, color: "var(--text-2)", fontSize: 13 }}>
                         {s.acceptanceCriteria.map((ac, k) => <li key={k}>{ac}</li>)}
                       </ul>
                     )}
                     <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                       <StatusBadge status={(s.priority || s.moscow) === "Must Have" || s.moscow === "MUST_HAVE" ? "fresh" : "current"} label={s.priority || s.moscow || "Story"}/>
                       {s.sequenceStage && <span style={{ fontSize: 11, padding: "2px 6px", background: "var(--surface-2)", borderRadius: 3 }}>{s.sequenceStage}</span>}
                       {s.storyPoints && <span style={{ fontSize: 11, padding: "2px 6px", background: "var(--surface-2)", borderRadius: 3 }}>{s.storyPoints} pts</span>}
                     </div>
                   </div>
                 </label>
               );
             })}
           </div>
        </div>
      ))}
    </div>
  );
}

function normaliseUserStoryGroups(data) {
  const stories = Array.isArray(data.userStories) ? data.userStories : [];
  if (stories.length === 0) return [];

  if (stories.some(s => Array.isArray(s.stories))) {
    return stories.map(group => ({
      persona: group.persona || group.name || "Stories",
      stories: group.stories || [],
    }));
  }

  const ordered = new Map();
  stories.forEach(story => {
    const key = story.sequenceStage || story.persona || "Stories";
    if (!ordered.has(key)) ordered.set(key, []);
    ordered.get(key).push(story);
  });

  return Array.from(ordered.entries()).map(([persona, groupStories]) => ({
    persona: persona.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    stories: groupStories,
  }));
}

function ScopeSpecViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Scope Specification</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      {data.criticalChange?.isCritical && (
        <div style={{ padding: 16, background: "var(--red-light)", color: "var(--red-dark)", borderRadius: "var(--radius-2)", marginBottom: 24, border: "1px solid var(--red-border)" }}>
           <strong>Critical Change Flag:</strong> {data.criticalChange.reasoning}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Core Functionalities (v1)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               {data.coreFunctionalities?.map((f, i) => (
                 <div key={i} style={{ padding: 12, background: "white", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)" }}>
                   <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{f.name}</div>
                   <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>{f.description}</div>
                 </div>
               ))}
            </div>
         </div>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Non-Core Functionalities</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               {data.nonCoreFunctionalities?.map((f, i) => (
                 <div key={i} style={{ padding: 12, background: "var(--surface-2)", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)", color: "var(--text-3)" }}>
                   <div style={{ fontWeight: 500 }}>{f.name}</div>
                   <div style={{ fontSize: 13, marginTop: 4 }}>{f.description}</div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      <div style={{ marginBottom: 32 }}>
         <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Roles and Permissions</h3>
         <div style={{ padding: 16, background: "white", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)", whiteSpace: "pre-wrap", color: "var(--text-2)", fontSize: 14 }}>
            {data.rolesAndPermissions}
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
         <div>
            <h3 style={{ color: "var(--text-2)", marginBottom: 12 }}>Out of Scope</h3>
            <ul style={{ color: "var(--text-3)", paddingLeft: 20, fontSize: 13 }}>
               {data.outOfScope?.map((o, i) => <li key={i} style={{ marginBottom: 6 }}>{o}</li>)}
            </ul>
         </div>
         <div>
            <h3 style={{ color: "var(--text-2)", marginBottom: 12 }}>Assumptions</h3>
            <ul style={{ color: "var(--text-3)", paddingLeft: 20, fontSize: 13 }}>
               {data.assumptions?.map((o, i) => <li key={i} style={{ marginBottom: 6 }}>{o}</li>)}
            </ul>
         </div>
         <div>
            <h3 style={{ color: "var(--text-2)", marginBottom: 12 }}>Constraints & Limitations</h3>
            <ul style={{ color: "var(--text-3)", paddingLeft: 20, fontSize: 13 }}>
               {data.constraints?.map((o, i) => <li key={i} style={{ marginBottom: 6 }}>{o}</li>)}
               {data.limitations?.map((o, i) => <li key={`lim-${i}`} style={{ marginBottom: 6 }}>{o}</li>)}
            </ul>
         </div>
      </div>
    </div>
  );
}

function FeasibilityTechViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Technical Architecture</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
         <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Architecture Overview</h3>
         <div style={{ whiteSpace: "pre-wrap", color: "var(--text-2)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            {data.architectureOverview}
         </div>
         {data.architectureDiagramMermaid && (
            <div>
               <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-2)" }}>Architecture Diagram</h4>
               <Mermaid chart={data.architectureDiagramMermaid} />
            </div>
         )}
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>System Components</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
         {data.systemComponents?.map((c, i) => (
            <div key={i} style={{ padding: 16, background: "white", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)" }}>
               <div style={{ fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                  {c.name}
                  <span style={{ fontSize: 11, background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>{c.techChoice}</span>
               </div>
               <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-2)" }}><strong>Responsibility:</strong> {c.responsibility}</div>
               <div style={{ fontSize: 13, marginTop: 4, color: "var(--text-3)" }}><em>{c.rationale}</em></div>
            </div>
         ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Data Model</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               {data.dataModel?.map((d, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "white", border: "1px solid var(--line-soft)", borderRadius: 6 }}>
                     <strong style={{ display: "block", fontSize: 14 }}>{d.entity}</strong>
                     <span style={{ fontSize: 13, color: "var(--text-3)" }}>{d.description}</span>
                  </div>
               ))}
            </div>
         </div>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Integration Points</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               {data.integrationPoints?.map((d, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "white", border: "1px solid var(--line-soft)", borderRadius: 6 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: 14 }}>{d.system}</strong>
                        <span style={{ fontSize: 10, background: d.type === 'External' ? 'var(--yellow-light)' : 'var(--blue-light)', color: d.type === 'External' ? 'var(--yellow-dark)' : 'var(--blue-dark)', padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>{d.type} · {d.protocol}</span>
                     </div>
                     <span style={{ fontSize: 13, color: "var(--text-3)", display: "block", marginTop: 4 }}>{d.purpose}</span>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Security & Compliance</h3>
            <div style={{ whiteSpace: "pre-wrap", color: "var(--text-2)", fontSize: 13 }}>{data.securityAndCompliance}</div>
         </div>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Infrastructure Dependencies</h3>
            <ul style={{ paddingLeft: 20, color: "var(--text-2)", fontSize: 13 }}>
               {data.infrastructureDependencies?.map((dep, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                     <strong>{dep.dependency}</strong> (Owner: {dep.responsibleParty}) {dep.jiraLink && <a href={dep.jiraLink} style={{ color: "var(--blue)" }}>[Ticket]</a>}
                  </li>
               ))}
            </ul>
         </div>
      </div>
    </div>
  );
}

function FeasibilityDesignViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Design Feasibility</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Design Principles</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 32 }}>
         {data.designPrinciples?.map((dp, i) => {
            const parts = dp.split(':');
            const name = parts[0];
            const desc = parts.slice(1).join(':').trim();
            return (
               <div key={i} style={{ padding: 16, background: "linear-gradient(to right bottom, var(--purple-light), white)", border: "1px solid var(--purple-border)", borderRadius: "var(--radius-2)" }}>
                  <div style={{ fontWeight: 600, color: "var(--purple-dark)", marginBottom: 8, fontSize: 14 }}>✦ {name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)" }}>{desc}</div>
               </div>
            );
         })}
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Wireflow ({data.screenCount} screens)</h3>
      {data.wireflow && data.wireflow.length > 0 && (
         <div style={{ marginBottom: 24 }}>
            <Mermaid chart={(() => {
              let chart = "flowchart LR\n";
              data.wireflow.forEach((w, i) => {
                const safeLabel = w.screen.replace(/["\\[\\]{}]/g, '');
                chart += `  S${i}["${safeLabel}"]\n`;
                if (i > 0) chart += `  S${i-1} --> S${i}\n`;
              });
              return chart;
            })()} />
         </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
         {data.wireflow?.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 16, background: "white", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)", padding: 16 }}>
               <div style={{ width: 32, height: 32, borderRadius: 16, background: "var(--surface-2)", color: "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flexShrink: 0 }}>
                  {i + 1}
               </div>
               <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{w.screen}</div>
                  <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.5 }}>{w.description}</div>
               </div>
            </div>
         ))}
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Accessibility Commitments</h3>
      <ul style={{ paddingLeft: 20, color: "var(--text-2)", fontSize: 14, lineHeight: 1.6 }}>
         {data.accessibilityCommitments?.map((ac, i) => <li key={i}>{ac}</li>)}
      </ul>
    </div>
  );
}
function CustomerJourneysViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Customer Journeys</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32, marginBottom: 32 }}>
         {data.customerJourneys?.map((j, i) => (
            <div key={i} style={{ background: "white", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)", padding: 20 }}>
               <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 11, background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4, fontWeight: 600, color: "var(--text-2)" }}>{j.persona}</span>
                  <h3 style={{ margin: "8px 0 0 0" }}>{j.title}</h3>
               </div>
               <div style={{ display: "flex", overflowX: "auto", gap: 16, paddingBottom: 12 }}>
                  {j.steps?.map((s, k) => (
                     <div key={k} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 160, flex: 1, position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                           <div style={{ width: 24, height: 24, borderRadius: 12, background: "var(--blue-light)", color: "var(--blue-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 11, flexShrink: 0, zIndex: 1 }}>
                              {s.stepNumber}
                           </div>
                           {k < j.steps.length - 1 && <div style={{ height: 2, background: "var(--line-soft)", flex: 1, marginLeft: -4, marginRight: -20 }} />}
                        </div>
                        <div>
                           <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>{s.action}</div>
                           <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>{s.detail}</div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         ))}
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Journey Insights</h3>
      <div style={{ padding: 16, background: "var(--blue-light)", color: "var(--blue-dark)", borderRadius: "var(--radius-2)", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>
         {data.journeyInsights}
      </div>
    </div>
  );
}

function DataPrivacyViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  const getImpactColor = (impact) => {
     if (impact === 'Yes') return { bg: 'var(--red-light)', fg: 'var(--red-dark)' };
     if (impact === 'Maybe') return { bg: 'var(--yellow-light)', fg: 'var(--yellow-dark)' };
     return { bg: 'var(--green-light)', fg: 'var(--green-dark)' };
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Data Privacy & Compliance</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Priority Actions</h3>
      <ul style={{ paddingLeft: 20, color: "var(--red-dark)", background: "var(--red-light)", padding: "16px 16px 16px 36px", borderRadius: "var(--radius-2)", fontSize: 14, marginBottom: 32 }}>
         {data.priorityActions?.map((pa, i) => <li key={i} style={{ marginBottom: 4 }}>{pa}</li>)}
      </ul>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Impact Matrix</h3>
      <table className="styled-table" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "var(--radius-2)", overflow: "hidden", border: "1px solid var(--line-soft)" }}>
         <thead style={{ background: "var(--surface-2)", textAlign: "left" }}>
            <tr>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Area</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Impact</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Description</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Mitigation</th>
            </tr>
         </thead>
         <tbody>
            {data.impactMatrix?.map((row, i) => {
               const color = getImpactColor(row.impact);
               return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                     <td style={{ padding: 12, fontWeight: 500 }}>{row.area}</td>
                     <td style={{ padding: 12 }}>
                        <span style={{ fontSize: 11, background: color.bg, color: color.fg, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{row.impact}</span>
                     </td>
                     <td style={{ padding: 12, fontSize: 13, color: "var(--text-2)" }}>{row.description}</td>
                     <td style={{ padding: 12, fontSize: 13 }}>{row.mitigation}</td>
                  </tr>
               );
            })}
         </tbody>
      </table>
    </div>
  );
}

function GtmReadinessViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>GTM Readiness</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
         <div style={{ background: "white", padding: 16, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Rollout Plan</h3>
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16 }}>{data.rollout?.plan}</p>
            <div style={{ marginBottom: 16 }}>
               <strong style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase" }}>Regions</strong>
               <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  {data.rollout?.regions?.map((r, i) => <span key={i} style={{ fontSize: 11, background: "var(--surface-2)", padding: "2px 8px", borderRadius: 4 }}>{r}</span>)}
               </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 16 }}>
               {data.rollout?.waves?.map((w, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 140, position: "relative", paddingTop: 8, paddingRight: 16 }}>
                     <div style={{ position: "absolute", top: 13, left: 12, right: 0, height: 2, background: "var(--line-soft)", zIndex: 0, display: i === data.rollout.waves.length - 1 ? 'none' : 'block' }} />
                     <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--blue-dark)", position: "relative", zIndex: 1, marginBottom: 12 }} />
                     <div style={{ fontSize: 12, fontWeight: 600 }}>Wave {w.waveNumber}</div>
                     <div style={{ fontSize: 11, color: "var(--blue-dark)", fontWeight: 600, marginBottom: 4 }}>{w.timing}</div>
                     <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.4 }}>{w.scope}</div>
                  </div>
               ))}
            </div>
         </div>

         <div style={{ background: "white", padding: 16, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Preview to GA</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
               <div>
                  <strong style={{ display: "block" }}>Cohort Description</strong>
                  <span style={{ color: "var(--text-2)" }}>{data.previewToGA?.previewCohortDescription}</span>
               </div>
               <div>
                  <strong style={{ display: "block" }}>Duration</strong>
                  <span style={{ color: "var(--text-2)" }}>{data.previewToGA?.previewDurationDays} days</span>
               </div>
               <div>
                  <strong style={{ display: "block" }}>Feedback Mechanism</strong>
                  <span style={{ color: "var(--text-2)" }}>{data.previewToGA?.feedbackMechanism}</span>
               </div>
               <div>
                  <strong style={{ display: "block" }}>GA Criteria</strong>
                  <span style={{ color: "var(--text-2)" }}>{data.previewToGA?.gaCriteria}</span>
               </div>
            </div>
         </div>
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>CX Stage Matrix</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
         {data.cxStageMatrix?.map((stage, i) => (
            <div key={i} style={{ background: "white", border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)", padding: 16 }}>
               <h4 style={{ margin: "0 0 12px 0", fontSize: 14 }}>{stage.stage}</h4>
               <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {stage.items?.map((item, k) => (
                     <li key={k} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, fontSize: 13, color: "var(--text-2)" }}>
                        <Icon.Check width="12" height="12" style={{ color: item.required ? 'var(--green-dark)' : 'var(--text-4)', marginTop: 2, flexShrink: 0 }}/>
                        <span>{item.item}</span>
                     </li>
                  ))}
               </ul>
            </div>
         ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Pricing & Monetization</h3>
            <div style={{ whiteSpace: "pre-wrap", color: "var(--text-2)", fontSize: 13 }}>{data.pricingAndMonetization}</div>
         </div>
         <div>
            <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Support & Troubleshooting</h3>
            <div style={{ whiteSpace: "pre-wrap", color: "var(--text-2)", fontSize: 13 }}>{data.supportAndTroubleshooting}</div>
         </div>
      </div>
    </div>
  );
}
function RisksRegistryViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  const getSeverityColor = (sev) => {
     if (sev === 'High') return { bg: 'var(--red-light)', fg: 'var(--red-dark)' };
     if (sev === 'Medium') return { bg: 'var(--yellow-light)', fg: 'var(--yellow-dark)' };
     return { bg: 'var(--green-light)', fg: 'var(--green-dark)' };
  };

  const riskCount = (probability, impact) =>
    data.risks?.filter(r => r.probability === probability && r.impact === impact).length || 0;

  const heatmapTone = (probability, impact) => {
    const score = ({ Low: 1, Medium: 2, High: 3 }[probability] || 1) * ({ Low: 1, Medium: 2, High: 3 }[impact] || 1);
    if (score >= 6) return { bg: 'var(--red-light)', fg: 'var(--red-dark)', border: 'var(--red-border)' };
    if (score >= 3) return { bg: 'var(--yellow-light)', fg: 'var(--yellow-dark)', border: 'var(--yellow-border)' };
    return { bg: 'var(--green-light)', fg: 'var(--green-dark)', border: 'var(--green-border)' };
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Risks Registry</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24, marginBottom: 32 }}>
         <div style={{ background: "white", padding: 20, border: "1px solid var(--red-border)", borderRadius: "var(--radius-2)" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "var(--red-dark)", display: "flex", alignItems: "center", gap: 8 }}>
               Top {data.top5Risks?.length} Risks
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-2)", fontSize: 14, lineHeight: 1.6 }}>
               {data.top5Risks?.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
         </div>
         <div style={{ background: "white", padding: 20, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 15 }}>By Category</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               {data.byCategory && Object.entries(data.byCategory).map(([cat, count], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                     <span style={{ color: "var(--text-2)" }}>{cat}</span>
                     <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
               ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
               <span>Total Risks</span>
               <span>{data.totalCount}</span>
            </div>
         </div>
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Risk Heatmap</h3>
      <table className="styled-table" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "var(--radius-2)", overflow: "hidden", border: "1px solid var(--line-soft)", marginBottom: 32 }}>
         <thead style={{ background: "var(--surface-2)", textAlign: "center" }}>
            <tr>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", textAlign: "left", width: 160 }}>Probability / Impact</th>
               {["Low", "Medium", "High"].map(impact => (
                  <th key={impact} style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>{impact}</th>
               ))}
            </tr>
         </thead>
         <tbody>
            {["High", "Medium", "Low"].map(probability => (
               <tr key={probability}>
                  <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", textAlign: "left", background: "var(--surface-2)", color: "var(--text-2)", fontWeight: 600 }}>{probability}</th>
                  {["Low", "Medium", "High"].map(impact => {
                     const count = riskCount(probability, impact);
                     const tone = heatmapTone(probability, impact);
                     return (
                        <td key={impact} style={{ padding: 8, borderBottom: "1px solid var(--line-soft)" }}>
                           <div style={{ minHeight: 58, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, border: `1px solid ${tone.border}`, background: tone.bg, color: tone.fg, borderRadius: "var(--radius-1)" }}>
                              <strong style={{ fontSize: 22, lineHeight: 1 }}>{count}</strong>
                              <span style={{ fontSize: 11, fontWeight: 600 }}>{count === 1 ? "risk" : "risks"}</span>
                           </div>
                        </td>
                     );
                  })}
               </tr>
            ))}
         </tbody>
      </table>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Full Risk Register</h3>
      <table className="styled-table" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "var(--radius-2)", overflow: "hidden", border: "1px solid var(--line-soft)" }}>
         <thead style={{ background: "var(--surface-2)", textAlign: "left" }}>
            <tr>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Risk</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600, width: 80 }}>Prob</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600, width: 80 }}>Impact</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Mitigation</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Owner</th>
            </tr>
         </thead>
         <tbody>
            {data.risks?.map((row, i) => {
               const pColor = getSeverityColor(row.probability);
               const iColor = getSeverityColor(row.impact);
               return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                     <td style={{ padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{row.risk}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{row.category}</div>
                     </td>
                     <td style={{ padding: 12 }}>
                        <span style={{ fontSize: 11, background: pColor.bg, color: pColor.fg, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{row.probability}</span>
                     </td>
                     <td style={{ padding: 12 }}>
                        <span style={{ fontSize: 11, background: iColor.bg, color: iColor.fg, padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{row.impact}</span>
                     </td>
                     <td style={{ padding: 12, fontSize: 13, color: "var(--text-2)" }}>{row.mitigation}</td>
                     <td style={{ padding: 12, fontSize: 12, color: "var(--text-3)" }}>{row.owner}</td>
                  </tr>
               );
            })}
         </tbody>
      </table>
    </div>
  );
}

function KpisViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  const metricGroups = [
    ["Adoption", data.adoption],
    ["Retention", data.retention],
    ["Usage", data.usage],
    ["Revenue / Value", data.revenue],
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Success Metrics & KPIs</h1>
          <SynthesisList value={data.phase1Synthesis} />
        </div>
      </div>

      {data.northStar && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>North Star Metric</h3>
          <table className="styled-table" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "var(--radius-2)", overflow: "hidden", border: "1px solid var(--line-soft)" }}>
            <tbody>
              {[
                ["Metric", data.northStar.metric],
                ["Definition", data.northStar.definition],
                ["Target", data.northStar.target],
                ["Cadence", data.northStar.cadence],
                ["Source", data.northStar.source],
                ["Rationale", data.northStar.rationale],
              ].map(([label, value]) => (
                <tr key={label} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <th style={{ width: 160, padding: 12, textAlign: "left", verticalAlign: "top", background: "var(--surface-2)", color: "var(--text-2)", fontWeight: 600 }}>{label}</th>
                  <td style={{ padding: 12, color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Metric Register</h3>
      <table className="styled-table" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "var(--radius-2)", overflow: "hidden", border: "1px solid var(--line-soft)", marginBottom: 32 }}>
        <thead style={{ background: "var(--surface-2)", textAlign: "left" }}>
          <tr>
            <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Category</th>
            <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Metric</th>
            <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Target</th>
            <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Cadence</th>
            <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Source</th>
          </tr>
        </thead>
        <tbody>
          {metricGroups.flatMap(([category, metrics]) =>
            (metrics || []).map((m, i) => (
              <tr key={`${category}-${i}`} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                <td style={{ padding: 12, verticalAlign: "top" }}>
                  <span style={{ fontSize: 11, background: "var(--surface-2)", color: "var(--text-2)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>{category}</span>
                </td>
                <td style={{ padding: 12, verticalAlign: "top", fontWeight: 500, fontSize: 13 }}>{m.metric}</td>
                <td style={{ padding: 12, verticalAlign: "top", color: "var(--text-2)", fontSize: 13 }}>{m.target}</td>
                <td style={{ padding: 12, verticalAlign: "top", color: "var(--text-3)", fontSize: 13 }}>{m.cadence}</td>
                <td style={{ padding: 12, verticalAlign: "top", color: "var(--text-3)", fontSize: 13 }}>{m.source}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12, marginTop: 32 }}>Feedback Mechanisms</h3>
      <ul style={{ paddingLeft: 20, color: "var(--text-2)", fontSize: 14 }}>
         {data.feedbackMechanisms?.map((fm, i) => <li key={i} style={{ marginBottom: 6 }}>{fm}</li>)}
      </ul>
    </div>
  );
}

function DaciStakeholdersViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;


  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>DACI & Stakeholders</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.daciSummary}</p>
        </div>
      </div>

      {data.pmConfirmationRequired?.length > 0 && (
         <div style={{ padding: 16, background: "var(--yellow-light)", color: "var(--yellow-dark)", borderRadius: "var(--radius-2)", marginBottom: 24, border: "1px solid var(--yellow-border)" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>Confirmation Required</h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
               {data.pmConfirmationRequired.map((req, i) => <li key={i}>{req}</li>)}
            </ul>
         </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
         <div style={{ background: "white", padding: 20, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>DACI Matrix</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
               <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--blue-dark)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>D</div>
                  <div>
                     <div style={{ fontWeight: 600 }}>{data.daci?.driver?.name}</div>
                     <div style={{ fontSize: 12, color: "var(--text-3)" }}>Driver · {data.daci?.driver?.role}</div>
                  </div>
               </div>
               <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--red-dark)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>A</div>
                  <div>
                     <div style={{ fontWeight: 600 }}>{data.daci?.approver?.name}</div>
                     <div style={{ fontSize: 12, color: "var(--text-3)" }}>Approver · {data.daci?.approver?.role}</div>
                  </div>
               </div>
               <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--green-dark)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>C</div>
                  <div>
                     <div style={{ fontWeight: 600 }}>Contributors</div>
                     <div style={{ fontSize: 12, color: "var(--text-3)" }}>{data.daci?.contributors?.map(c => c.name).join(', ')}</div>
                  </div>
               </div>
               <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: "var(--text-4)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>I</div>
                  <div>
                     <div style={{ fontWeight: 600 }}>Informed</div>
                     <div style={{ fontSize: 12, color: "var(--text-3)" }}>{data.daci?.informed?.map(c => c.name).join(', ')}</div>
                  </div>
               </div>
            </div>
         </div>

         <div style={{ background: "white", padding: 20, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-2)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Section Status</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
               {data.sectionStatus?.map((sec, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6 }}>
                     <span style={{ fontSize: 13, fontWeight: 500 }}>{sec.section}</span>
                     <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: sec.draftComplete ? "var(--green-light)" : "var(--line-soft)", color: sec.draftComplete ? "var(--green-dark)" : "var(--text-3)" }}>
                           {sec.draftComplete ? "DRAFTED" : "PENDING"}
                        </span>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: sec.finalComplete ? "var(--green-dark)" : "var(--line-soft)", color: sec.finalComplete ? "white" : "var(--text-3)" }}>
                           {sec.finalComplete ? "FINAL" : "NOT FINAL"}
                        </span>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>Key Contacts</h3>
      <table className="styled-table" style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "var(--radius-2)", overflow: "hidden", border: "1px solid var(--line-soft)" }}>
         <thead style={{ background: "var(--surface-2)", textAlign: "left" }}>
            <tr>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Name</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Role</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Team / Company</th>
               <th style={{ padding: 12, borderBottom: "1px solid var(--line-soft)", fontWeight: 600 }}>Email</th>
            </tr>
         </thead>
         <tbody>
            {data.keyContacts?.map((c, i) => (
               <tr key={i} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: 12, fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "var(--text-2)" }}>{c.role}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "var(--text-2)" }}>{c.company}</td>
                  <td style={{ padding: 12, fontSize: 13, color: "var(--blue)" }}>{c.email}</td>
               </tr>
            ))}
         </tbody>
      </table>
    </div>
  );
}

const EPIC_VIEWERS = {
  "user-stories": UserStoriesViewer,
  "scope-spec": ScopeSpecViewer,
  "feasibility-tech": FeasibilityTechViewer,
  "feasibility-design": FeasibilityDesignViewer,
  "customer-journeys": CustomerJourneysViewer,
  "data-privacy": DataPrivacyViewer,
  "gtm-readiness": GtmReadinessViewer,
  "risks-registry": RisksRegistryViewer,
  "kpis": KpisViewer,
  "daci-stakeholders": DaciStakeholdersViewer
};

Object.assign(window, {
  EPIC_VIEWERS,
  UserStoriesViewer,
  ScopeSpecViewer,
  FeasibilityTechViewer,
  FeasibilityDesignViewer,
  CustomerJourneysViewer,
  DataPrivacyViewer,
  GtmReadinessViewer,
  RisksRegistryViewer,
  KpisViewer,
  DaciStakeholdersViewer
});
