# ProductFlow Architecture: LLM Role & Evolution

*Captured: 2026-05-29. Reference for future architectural decisions.*

---

## 1. Does ProductFlow do the heavy lifting, or does the LLM?

It is a deliberate partnership. Neither is useful without the other.

### What ProductFlow does (the structure layer)

- **Persistence** — robot outputs, PDD versions, freshness timestamps, feedback ratings, DACI data — stored locally on disk. The LLM has no memory between sessions; ProductFlow does.
- **Workflow enforcement** — phase gates (Phase 1 must complete before Phase 2), robot ordering, staleness windows, `promote-to-phase-2` — hard rules in code that the LLM cannot break or skip.
- **Structured schemas** — the `pddSchema`, robot output shapes, `assemblyPayload` format — ProductFlow defines exactly what structure the LLM must produce. Without this, the LLM would hallucinate its own format every time.
- **Context assembly** — loading all robot outputs, the DACI file, phase2-context, experiment selections, and packaging into a single prompt payload. The LLM cannot reach into the filesystem.
- **Tool registration** — every MCP tool (`run-robot`, `save-robot-output`, `generate-pdd`, etc.) is a controlled boundary for when the LLM can write to disk and what it must provide.
- **Cockpit UI** — HTTP server, artifact browser, freshness tracker, rendering pipeline.

### What the LLM does (the intelligence layer)

- **Generating the actual analysis** — Scout's market research, Detective's competitive teardown, People's persona synthesis, Money's financial model. Deep, product-specific reasoning that no amount of code can replace.
- **Assembling the PDD** — mapping 17 robot outputs across a schema into a coherent, executive-ready document. Requires judgment, synthesis, and writing.
- **The interview** — understanding ambiguous PM answers and building structured context from them.
- **Executing robot instructions** — the `_claudeInstructions` pattern tells the LLM exactly who to be, what rules to enforce, and what sections to produce.

### Summary table

| Concern | ProductFlow | LLM |
|---|---|---|
| Memory across sessions | ✅ | ❌ |
| Workflow / phase gates | ✅ | ❌ |
| Schema enforcement | ✅ | ❌ |
| File I/O | ✅ | ❌ |
| Strategic analysis | ❌ | ✅ |
| Writing quality | ❌ | ✅ |
| Synthesis / judgment | ❌ | ✅ |

> **ProductFlow without an LLM** = a well-organised empty folder.
> **An LLM without ProductFlow** = brilliant analysis that evaporates the moment you close the chat.

---

## 2. Does the LLM client's own tooling affect ProductFlow output?

Yes, significantly. Every LLM client (Claude Desktop, ChatGPT, Cursor, Antigravity, etc.) layers its own logic on top of the raw model.

### What "client tooling" means

- **System prompts** — invisible instructions injected before every conversation
- **Context windows** — how much text the client passes to the model at once
- **Tool call handling** — how MCP tools are presented and executed
- **Memory / summarisation** — whether the client compresses old context
- **Safety filters** — what content the client blocks before the model sees it
- **Model version** — Claude Sonnet vs Opus, GPT-4o vs o3, etc.

### How this directly affects ProductFlow

**Instruction fidelity** is the biggest variable. ProductFlow's robots embed precise `_claudeInstructions`. A client with a conflicting system prompt (e.g. "always be concise") will fight against a robot mandate to produce a detailed financial model.

**Output format compliance** — Phase 2 robots mandate pure JSON, no fences, no commentary. GPT-4o tends to wrap JSON in markdown fences despite instructions. `pdd-composer._tryParseJson()` strips fences defensively, but complex nesting can still break.

**Context window compression** — The `generate-pdd` payload is enormous (17 robot outputs). If the client silently compresses old context, the LLM may assemble the PDD from partial data without signalling it.

**Model intelligence ceiling** — the difference between Claude Opus and GPT-3.5 running the same ProductFlow robot is dramatic. Same instructions, very different output quality.

### Expected behaviour by client

| Client | Expected behaviour |
|---|---|
| **Claude Desktop (Sonnet/Opus)** | Best instruction compliance, cleanest JSON — the tested path |
| **Claude via Antigravity** | Same model, additional system context — generally fine |
| **ChatGPT (GPT-4o)** | Good quality but tends to add markdown fences; `_tryParseJson` handles most cases |
| **ChatGPT (older models)** | May miss sections, fail schema compliance, produce generic output |
| **Cursor / Windsurf** | IDE-focused system prompts may push toward code output even for strategy robots |

### How ProductFlow defends against this

- `_tryParseJson` strips fences and finds embedded JSON in messy output
- Double-parse guard in every robot handles string vs object ambiguity
- `mandate` array uses `NEVER` and `ALWAYS` explicitly — harder for conflicting prompts to override
- The schema passed to `generate-pdd` is exhaustive — even a weaker model has a clear blueprint

---

## 3. Direct API mode: calling the LLM directly instead of using an MCP client

### Current architecture (MCP / stdio)

```
PM types in Claude Desktop
    → Claude decides to call run-robot
    → MCP stdio → ProductFlow tools execute
    → ProductFlow returns structured payload
    → Claude does the analysis / writing
    → PM calls save-robot-output
    → ProductFlow saves to disk
```

The **LLM client is the orchestrator**. ProductFlow is passive — it only acts when the client calls a tool.

### Future architecture (direct API mode)

```
PM triggers action in ProductFlow (CLI or UI button)
    → ProductFlow calls Anthropic/OpenAI API directly
    → ProductFlow assembles the prompt (role + mandate + context)
    → LLM responds with analysis / JSON
    → ProductFlow validates + saves automatically
    → No human in the loop unless ProductFlow asks for input
```

**ProductFlow becomes the orchestrator.** The LLM is now just a function call.

### What is already built vs. what needs to be added

| Already built | What to add |
|---|---|
| Robot `_claudeInstructions` (role, mandate, schema) | An API caller that sends these as `system` + `user` messages |
| `pdd-composer` assembles the full payload | An auto-save loop instead of waiting for PM to call `save-robot-output` |
| `_tryParseJson` for output parsing | Retry logic if the model returns malformed JSON |
| Phase gates and robot ordering in `team-leader.js` | A runner that walks `ROBOT_ORDER` automatically |
| Freshness tracker (knows when to re-run) | Already in place |
| Asset store (saves files) | Already in place |

### The three new files to write

**`src/llm-client.js`** (~50 lines)
```js
// Calls Anthropic or OpenAI with a system prompt + user message
// Returns the text response
export async function callLLM({ systemPrompt, userMessage, model }) { ... }
```

**`src/robot-runner.js`** (~100 lines)
```js
// Walks ROBOT_ORDER, calls each robot's analyze(),
// sends to callLLM(), validates output, saves via assetStore
export async function runRobot(robotName, enrichedContext, slug) { ... }
```

**`src/orchestrator.js`** (~200 lines)
```js
// Manages the full session: interview → Phase 1 → gate → Phase 2 → PDD
// Currently this logic lives in the PM's head and Claude's judgment
export async function runFullSession(slug) { ... }
```

### What this changes

Currently Claude does **two jobs**:
1. **Orchestrating** — deciding when to call which tool, in what order, asking for input at the right moments
2. **Analysing** — the actual strategic thinking inside each robot

In direct API mode, **ProductFlow takes over job 1**. The API only does job 2.

**Benefits:**
- Full automation — run an entire Phase 1 unattended
- Model independence — swap Anthropic for OpenAI or Gemini in one config line
- No dependency on any client's system prompts or tooling quirks
- Better cost control — you choose when and how often to call the API

**Trade-off:**
- You lose Claude's conversational judgment for edge cases (e.g. "this answer is ambiguous, let me ask a follow-up")

### When does this make sense?

**Not yet.** The current MCP model is the right prototype stage. It lets you iterate on robot quality and workflow logic without writing orchestration code. Once robots are stable and output quality is proven, migrating to direct API mode is a clean, well-scoped project — estimated **2–3 weeks of work** given how well the architecture is already structured for it.

The trigger to revisit: when you find yourself wanting to run robots automatically (e.g. overnight, on a schedule, or from a button in the Cockpit UI) rather than manually through a chat session.
