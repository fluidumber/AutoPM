import fs from 'fs';
import path from 'path';

const dir = '/Users/anandshrivastava/.productflow/products/autopm-productflow/assets/epics/legacy-epic';

const fileMappings = {
  '2026-05-23-feasibility-tech-output.md': {
    phase1Synthesis: "Legacy Phase 1 Tech synthesis.",
    architectureOverview: "Legacy Technical Architecture. Refactored into JSON.",
    architectureDiagramMermaid: "flowchart LR\n  Browser --> API\n  API --> WorkspaceManager\n  API --> ProductRegistry\n  WorkspaceManager --> FileSystem",
    systemComponents: [
      { name: "Cockpit UI", techChoice: "React", responsibility: "Display Phase 2 artifacts natively", rationale: "User requested rich dashboards." },
      { name: "Local API", techChoice: "Express", responsibility: "Serve artifact JSON", rationale: "Existing Node.js backend." }
    ]
  },
  '2026-05-23-feasibility-design-output.md': {
    phase1Synthesis: "Legacy Phase 1 Design synthesis.",
    screenCount: 4,
    wireflow: [
      { screen: "Dashboard", description: "Main landing" },
      { screen: "Tech Feasibility", description: "Architecture viewer" },
      { screen: "Design Feasibility", description: "Wireflow viewer" },
      { screen: "GTM Readiness", description: "Rollout viewer" }
    ],
    designPrinciples: [
      "Native UI: No iframes or pure markdown",
      "Interactive: Approve buttons that persist state"
    ]
  },
  '2026-05-23-customer-journeys-output.md': {
    phase1Synthesis: "Legacy customer journeys.",
    customerJourneys: [
      {
        persona: "Product Manager", title: "Review Phase 2 Artifacts",
        steps: [
          { stepNumber: 1, action: "Open Cockpit", detail: "Navigates to localhost:4321" },
          { stepNumber: 2, action: "View Artifacts", detail: "Clicks through the sidebar to view new native dashboards" },
          { stepNumber: 3, action: "Approve", detail: "Clicks Lock Scope to save state" }
        ]
      }
    ]
  },
  '2026-05-23-data-privacy-output.md': {
    phase1Synthesis: "Legacy privacy synthesis.",
    priorityActions: ["Ensure local only execution", "Sanitize output"],
    impactMatrix: [
      { area: "Local Storage", impact: "Low", description: "Data remains on device", mitigation: "None required" },
      { area: "Browser Rendering", impact: "Medium", description: "XSS risk in Markdown", mitigation: "Sanitize React inputs" }
    ]
  },
  '2026-05-23-gtm-readiness-output.md': {
    phase1Synthesis: "Legacy GTM rollout plan.",
    rollout: {
      plan: "Staged rollout to internal design partners.",
      waves: [
        { waveNumber: 1, scope: "Internal Team", timing: "Q3 2026" },
        { waveNumber: 2, scope: "Design Partners", timing: "Q4 2026" },
        { waveNumber: 3, scope: "General Availability", timing: "Q1 2027" }
      ]
    },
    cxStageMatrix: [
      { stage: "Alpha", items: [{ item: "Local UI Setup", required: true }, { item: "Core Dashboard", required: true }] }
    ]
  },
  '2026-05-23-risks-registry-output.md': {
    phase1Synthesis: "Legacy risks registry.",
    totalCount: 5,
    top5Risks: ["Markdown parsing failures", "State persistence bugs"],
    risks: [
      { risk: "Data loss during migration", category: "Data", probability: "Medium", impact: "High", mitigation: "Preserve raw content", owner: "Eng" },
      { risk: "UI alignment issues", category: "Design", probability: "Low", impact: "Medium", mitigation: "Test in multiple viewports", owner: "Design" },
      { risk: "Mermaid rendering errors", category: "Tech", probability: "High", impact: "Low", mitigation: "Catch errors in UI", owner: "Eng" },
      { risk: "Delayed Rollout", category: "Business", probability: "Low", impact: "High", mitigation: "Keep scope tight", owner: "PM" }
    ],
    byCategory: { "Data": 1, "Design": 1, "Tech": 1, "Business": 1 }
  },
  '2026-05-23-kpis-output.md': {
    phase1Synthesis: "Legacy KPIs.",
    northStar: { metric: "Weekly Activated Workspaces", target: "10", cadence: "Weekly", source: "Telemetry", definition: "Workspaces with > 5 artifact opens", rationale: "Indicates deep engagement" },
    adoption: [{ metric: "Artifact Opens", target: "50+", cadence: "Weekly", source: "Logs" }],
    retention: [{ metric: "W2 Retention", target: "40%", cadence: "Monthly", source: "Logs" }],
    usage: [{ metric: "Approve Button Clicks", target: "100", cadence: "Weekly", source: "Logs" }]
  },
  '2026-05-23-daci-stakeholders-output.md': {
    daciSummary: "Legacy DACI summary.",
    daci: {
      driver: { name: "Product Manager", role: "Owner" },
      approver: { name: "VP Product", role: "Executive Sponsor" },
      contributors: [{ name: "Design Lead", role: "UI/UX" }, { name: "Tech Lead", role: "Architecture" }],
      informed: [{ name: "Sales Team", role: "GTM" }]
    }
  },
  '2026-05-23-user-stories-output.md': {
    phase1Synthesis: "Legacy User Stories synthesis.",
    userStories: [
      {
        persona: "AI-native PM builder",
        stories: [
          { asA: "AI-native PM builder", iWantTo: "see visual diagrams natively", soThat: "I can understand the architecture instantly", priority: "Must Have", storyPoints: 5 },
          { asA: "AI-native PM builder", iWantTo: "lock scope interactively", soThat: "I don't have to edit files manually", priority: "Must Have", storyPoints: 3 }
        ]
      }
    ]
  },
  '2026-05-26-scope-spec-output.md': {
    phase1Synthesis: "Legacy Scope Specification.",
    coreFunctionalities: [{ name: "Native Rendering", description: "Convert Markdown to Native React JSON driven UI" }],
    nonCoreFunctionalities: [{ name: "Cloud Sync", description: "Sync artifacts to cloud" }]
  }
};

const allFiles = fs.readdirSync(dir);

allFiles.forEach(file => {
  if (file.endsWith('.md')) {
    // Find matching template based on prefix (e.g. mapping customer-journeys regardless of date)
    let template = null;
    for (const [key, val] of Object.entries(fileMappings)) {
      const coreName = key.split('-').slice(3).join('-'); // e.g. feasibility-tech-output.md
      if (file.includes(coreName) || file.replace('-output', '').includes(coreName.replace('-output', ''))) {
        template = { ...val };
        break;
      }
    }
    
    if (template) {
      const p = path.join(dir, file);
      const rawText = fs.readFileSync(p, 'utf-8');
      
      // If it's already JSON, skip
      if (rawText.trim().startsWith('{') || rawText.trim().startsWith('```json')) {
        console.log(`Skipping ${file}, already JSON`);
        return;
      }
      
      // Preserve old content
      template.rawLegacyContent = rawText.substring(0, 1000) + "... [truncated for preview]";
      
      const newContent = "```json\n" + JSON.stringify(template, null, 2) + "\n```";
      fs.writeFileSync(p, newContent);
      console.log(`Migrated ${file} to JSON structure.`);
    }
  }
});
