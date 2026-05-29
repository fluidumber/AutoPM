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

function UserStoriesViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  const [selectedStories, setSelectedStories] = useState(new Set());

  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

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
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleLockScope} className="btn primary" disabled={selectedStories.size === 0}>
          <Icon.Check width="12" height="12"/> Lock Scope ({selectedStories.size})
        </button>
      </div>

      {data.userStories && data.userStories.map((personaCluster, i) => (
        <div key={i} style={{ marginBottom: 32 }}>
           <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12 }}>{personaCluster.persona}</h3>
           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
             {personaCluster.stories.map((s, j) => {
               const id = `${personaCluster.persona}-${j}`;
               return (
                 <label key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 12, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)", background: "white", cursor: "pointer" }}>
                   <input type="checkbox" checked={selectedStories.has(id)} onChange={() => handleToggle(id)} style={{ marginTop: 4 }}/>
                   <div>
                     <div style={{ fontWeight: 500 }}>{s.asA} I want to {s.iWantTo} so that {s.soThat}</div>
                     {s.acceptanceCriteria && (
                       <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, color: "var(--text-2)", fontSize: 13 }}>
                         {s.acceptanceCriteria.map((ac, k) => <li key={k}>{ac}</li>)}
                       </ul>
                     )}
                     <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                       <StatusBadge status={s.priority === "Must Have" ? "fresh" : "current"} label={s.priority}/>
                       <span style={{ fontSize: 11, padding: "2px 6px", background: "var(--surface-2)", borderRadius: 3 }}>{s.storyPoints} pts</span>
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

function ScopeSpecViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: "experiment", id: "approve-scope", title: "Scope Approved", description: "Scope specification approved" })
    }).then(() => setApproved(true));
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Scope Specification</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'Scope Approved' : 'Approve Scope'}
        </button>
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
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-tech", title: "Architecture Approved", description: "Technical feasibility approved" }) }).then(() => setApproved(true));
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Technical Architecture</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'Architecture Approved' : 'Approve Architecture'}
        </button>
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
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-design", title: "Design Approved", description: "Design feasibility approved" }) }).then(() => setApproved(true));
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Design Feasibility</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'Design Approved' : 'Approve Design'}
        </button>
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
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-journeys", title: "Journeys Approved", description: "Customer journeys approved" }) }).then(() => setApproved(true));
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Customer Journeys</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'Journeys Approved' : 'Approve Journeys'}
        </button>
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
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-privacy", title: "Privacy Approved", description: "Data privacy & security approved" }) }).then(() => setApproved(true));
  };

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
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'Privacy Approved' : 'Approve Privacy'}
        </button>
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
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-gtm", title: "GTM Approved", description: "GTM Readiness approved" }) }).then(() => setApproved(true));
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>GTM Readiness</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'GTM Approved' : 'Approve GTM'}
        </button>
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
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-risks", title: "Risks Approved", description: "Risks registry approved" }) }).then(() => setApproved(true));
  };

  const getSeverityColor = (sev) => {
     if (sev === 'High') return { bg: 'var(--red-light)', fg: 'var(--red-dark)' };
     if (sev === 'Medium') return { bg: 'var(--yellow-light)', fg: 'var(--yellow-dark)' };
     return { bg: 'var(--green-light)', fg: 'var(--green-dark)' };
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Risks Registry</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'Risks Approved' : 'Approve Risks'}
        </button>
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
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
         <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 8, alignItems: "center" }}>
            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Probability</div>
            <div>
               <div style={{ display: "grid", gridTemplateColumns: "80px 100px 100px 100px", gap: 4, textAlign: "center" }}>
                  <div />
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", paddingBottom: 8 }}>Low</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", paddingBottom: 8 }}>Medium</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", paddingBottom: 8 }}>High</div>

                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textAlign: "right", paddingRight: 8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>High</div>
                  <div style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--yellow-dark)" }}>
                     {data.risks?.filter(r => r.probability === 'High' && r.impact === 'Low').length || ''}
                  </div>
                  <div style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--red-dark)" }}>
                     {data.risks?.filter(r => r.probability === 'High' && r.impact === 'Medium').length || ''}
                  </div>
                  <div style={{ background: "var(--red)", border: "1px solid var(--red-dark)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "white" }}>
                     {data.risks?.filter(r => r.probability === 'High' && r.impact === 'High').length || ''}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textAlign: "right", paddingRight: 8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>Medium</div>
                  <div style={{ background: "var(--green-light)", border: "1px solid var(--green-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--green-dark)" }}>
                     {data.risks?.filter(r => r.probability === 'Medium' && r.impact === 'Low').length || ''}
                  </div>
                  <div style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--yellow-dark)" }}>
                     {data.risks?.filter(r => r.probability === 'Medium' && r.impact === 'Medium').length || ''}
                  </div>
                  <div style={{ background: "var(--red-light)", border: "1px solid var(--red-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--red-dark)" }}>
                     {data.risks?.filter(r => r.probability === 'Medium' && r.impact === 'High').length || ''}
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textAlign: "right", paddingRight: 8, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>Low</div>
                  <div style={{ background: "var(--green-light)", border: "1px solid var(--green-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--green-dark)", opacity: 0.6 }}>
                     {data.risks?.filter(r => r.probability === 'Low' && r.impact === 'Low').length || ''}
                  </div>
                  <div style={{ background: "var(--green-light)", border: "1px solid var(--green-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--green-dark)" }}>
                     {data.risks?.filter(r => r.probability === 'Low' && r.impact === 'Medium').length || ''}
                  </div>
                  <div style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow-border)", height: 60, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, fontWeight: 700, fontSize: 18, color: "var(--yellow-dark)" }}>
                     {data.risks?.filter(r => r.probability === 'Low' && r.impact === 'High').length || ''}
                  </div>
               </div>
               <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 12, paddingLeft: 80 }}>Impact</div>
            </div>
         </div>
      </div>

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
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-kpis", title: "KPIs Approved", description: "Success metrics & KPIs approved" }) }).then(() => setApproved(true));
  };

  const renderMetricGrid = (title, metrics) => (
     <div style={{ marginBottom: 24 }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "var(--text-2)" }}>{title}</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
           {metrics?.map((m, i) => (
              <div key={i} style={{ background: "white", padding: 16, border: "1px solid var(--line-soft)", borderRadius: "var(--radius-1)" }}>
                 <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{m.metric}</div>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "var(--blue-dark)" }}>{m.target}</span>
                 </div>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", borderTop: "1px solid var(--line-soft)", paddingTop: 8, marginTop: 8 }}>
                    <span>{m.cadence}</span>
                    <span>{m.source}</span>
                 </div>
              </div>
           ))}
        </div>
     </div>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Success Metrics & KPIs</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.phase1Synthesis}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'KPIs Approved' : 'Approve KPIs'}
        </button>
      </div>

      {data.northStar && (
         <div style={{ background: "linear-gradient(to right bottom, var(--blue-dark), #1a365d)", color: "white", padding: 24, borderRadius: "var(--radius-2)", marginBottom: 32, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>North Star Metric</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
               <div>
                  <h2 style={{ margin: "0 0 8px 0", fontSize: 28 }}>{data.northStar.metric}</h2>
                  <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "rgba(255,255,255,0.9)", maxWidth: 500 }}>{data.northStar.definition}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.8)", fontStyle: "italic" }}>"{data.northStar.rationale}"</p>
               </div>
               <div style={{ background: "rgba(255,255,255,0.1)", padding: 16, borderRadius: "var(--radius-1)", minWidth: 150 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{data.northStar.target}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between" }}>
                     <span>{data.northStar.cadence}</span>
                     <span>{data.northStar.source}</span>
                  </div>
               </div>
            </div>
         </div>
      )}

      {renderMetricGrid("Adoption Metrics", data.adoption)}
      {renderMetricGrid("Retention Metrics", data.retention)}
      {renderMetricGrid("Usage Metrics", data.usage)}
      {renderMetricGrid("Revenue / Value Metrics", data.revenue)}

      <h3 style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 12, marginTop: 32 }}>Feedback Mechanisms</h3>
      <ul style={{ paddingLeft: 20, color: "var(--text-2)", fontSize: 14 }}>
         {data.feedbackMechanisms?.map((fm, i) => <li key={i} style={{ marginBottom: 6 }}>{fm}</li>)}
      </ul>
    </div>
  );
}

function DaciStakeholdersViewer({ artifact }) {
  const data = useJsonArtifact(artifact);
  const [approved, setApproved] = useState(false);
  
  if (!data) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleApprove = () => {
    fetch('/api/select-experiment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "experiment", id: "approve-daci", title: "DACI Approved", description: "Stakeholders & DACI approved" }) }).then(() => setApproved(true));
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24, background: "var(--surface)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>DACI & Stakeholders</h1>
          <p style={{ marginTop: 6, color: "var(--text-3)", maxWidth: 600 }}>{data.daciSummary}</p>
        </div>
        <button onClick={handleApprove} className={`btn ${approved ? 'ghost-outline' : 'primary'}`} disabled={approved}>
          <Icon.Check width="12" height="12"/> {approved ? 'DACI Approved' : 'Approve DACI'}
        </button>
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
