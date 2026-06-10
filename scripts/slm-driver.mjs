// Headless driver for ProductFlow — runs the SLM-takeover hypothesis end-to-end.
// Uses the product's own classes exactly as mcp-server.js wires them.
//
// Commands:
//   setup                         create product + seed interview answers (PM Anand)
//   payload <robot> [epicId]      run a robot, print its _claudeInstructions payload JSON
//   save <robot> <mdfile> [epic]  persist Claude-authored output markdown for a robot
//   gate                          print Phase 1 business-gate freshness
//   promote                       write phase2-context.json manifest (promote to Phase 2)
//   pdd-payload [epicId]          assemble PDD payload (pddComposer.assemble)
//   save-pdd <jsonfile> [epicId]  render + persist PDD json/md/html

import fs from "fs/promises";
import path from "path";
import os from "os";

// Keep stdout clean for JSON payloads — route all logging to stderr.
console.log = (...a) => process.stderr.write(a.join(" ") + "\n");

import TeamLeader from "../leader/team-leader.js";
import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import { PMProfile } from "../src/workspace/pm-profile.js";
import { ProductRegistry } from "../src/workspace/product-registry.js";
import { PDDComposer } from "../src/workspace/pdd-composer.js";
import { renderMarkdown, renderHtml } from "../utils/pdd-renderer.js";
import {
  ROBOT_ORDER_BUSINESS,
  ROBOT_ORDER_EPIC_STRATEGY,
} from "../src/config/robot-registry.js";

const PRODUCT_NAME = "EdgeMind";
const STATE_FILE = path.join(os.tmpdir(), "slm-enriched.json");

const RAW_IDEA =
  "EdgeMind is a general-purpose Small Language Model (SLM) foundation model and cross-platform SDK engineered to run fully on-device — phones, laptops, wearables, automotive, and IoT — delivering capable general AI without a cloud round-trip. Core hypothesis: SLMs will displace cloud LLMs for the majority of inference, the same way client-server and edge computing displaced the mainframe.";

const ANSWERS = {
  target_geo:
    "Global, with initial design-partner focus on North America + EU device OEMs and regulated enterprises with data-residency constraints.",
  market_segment:
    "B2B and B2B2C — sell to device OEMs, enterprise app developers, and platform companies who embed the SLM; end value reaches consumers through their devices.",
  market_size_known:
    "Partial estimate: analysts peg the on-device / edge AI software market around $20B by 2030, but the figure is contested — research and pressure-test it.",
  buyer_vs_user:
    "Buyer: VP Eng / Head of AI Platform at OEMs and ISVs. User: app developers integrating the SLM SDK, and ultimately the consumer using the device.",
  pain_point:
    "Cloud LLM inference is expensive, high-latency, privacy-exposing, and unusable offline. Today teams either pay per-token to OpenAI/Anthropic or hand-roll quantized open models (Llama, Phi, Gemma) with heavy ML effort. The #1 pain: getting capable, general AI to run reliably on constrained edge hardware with no cloud round-trip.",
  willingness_to_pay:
    "ISVs pay $0.50-2 per 1M tokens to cloud LLMs today; large OEMs run multi-million-dollar cloud AI bills. We anchor on an SDK license + per-device royalty + enterprise support tier.",
  known_competitors:
    "Apple Intelligence on-device foundation models, Google Gemini Nano, Microsoft Phi, Meta Llama (quantized), Mistral, Liquid AI, Qualcomm AI Engine/AI Hub, llama.cpp / Ollama ecosystem, Arm/MediaTek NPU stacks.",
  why_existing_fail:
    "Cloud LLMs ignore offline/privacy/cost. Existing SLMs are either narrow, vendor-locked (Apple and Google own their own devices and won't license out), or demand deep ML expertise to deploy. There is no neutral, general, cross-platform SLM foundation + tooling layer a third party can embed.",
  revenue_model:
    "Hybrid: per-device royalty + SDK license to OEMs, usage-tiered enterprise license for ISVs, and an open-core community edition to drive bottom-up adoption.",
  funding_stage:
    "Internal new-bet / seed-equivalent. We are building the investment hypothesis now to decide whether to fund it.",
  timeline:
    "12-18 months to a credible general SLM + cross-platform SDK MVP; signed design partners within 6-9 months.",
  team_size:
    "Small but senior: ~8-12 people (ML researchers, edge/runtime engineers, DevRel). Assumes net-new hiring.",
  tech_preferences:
    "AI/ML core: sub-3B-parameter model architecture, aggressive quantization + distillation, on-device runtimes (CoreML, NNAPI, ONNX Runtime, GGUF), a cross-platform SDK, and NPU acceleration across Apple/Qualcomm/MediaTek/Arm.",
  reference_companies:
    "Apple Intelligence, Google Gemini Nano, Microsoft Phi, Mistral, Liquid AI, Qualcomm AI Hub. Historical analogs: client-server displacing the mainframe; edge/CDN displacing centralized servers.",
  data_sources:
    "Edge-AI analyst reports (Gartner, ABI, IDC), Hugging Face open-model leaderboards, MLPerf, vendor NPU specifications, and arXiv SLM literature.",
};

function makeStack() {
  const workspace = new WorkspaceManager();
  const pmProfile = new PMProfile(workspace);
  const productRegistry = new ProductRegistry(workspace, pmProfile);
  const teamLeader = new TeamLeader();
  const pddComposer = new PDDComposer(workspace, teamLeader.assetStore);
  return { workspace, pmProfile, productRegistry, teamLeader, pddComposer };
}

async function buildEnriched(teamLeader) {
  // Seed every answer so the interview completes immediately and emits enrichedContext.
  const res = teamLeader.interviewer.startInterview(RAW_IDEA, {
    preFilledAnswers: ANSWERS,
  });
  if (res.type !== "complete") {
    // Walk to completion if any question wasn't auto-covered.
    let cur = res;
    let guard = 0;
    while (cur.type !== "complete" && guard++ < 50) {
      cur = teamLeader.interviewer.skipQuestion(cur.sessionId);
    }
    return cur.enrichedContext;
  }
  return res.enrichedContext;
}

async function rebuildSession(stack, slug) {
  await stack.teamLeader.ready;
  const enriched = JSON.parse(await fs.readFile(STATE_FILE, "utf-8"));
  const analysisId = stack.teamLeader.startAnalysis(enriched, { productSlug: slug });
  return { analysisId, enriched };
}

const slugOf = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const stack = makeStack();
  await stack.teamLeader.ready;
  const slug = slugOf(PRODUCT_NAME);

  if (cmd === "setup") {
    const created = await stack.productRegistry.create({
      name: PRODUCT_NAME,
      overview:
        "General-purpose on-device SLM foundation model + cross-platform SDK. Thesis: SLMs displace cloud LLMs for most inference.",
      stage: "Hypothesis / new-bet",
      targetMarket: "Device OEMs, enterprise ISVs, regulated enterprises (global)",
      competitors: [
        "Apple Intelligence",
        "Google Gemini Nano",
        "Microsoft Phi",
        "Mistral",
        "Liquid AI",
        "Qualcomm AI Hub",
      ],
      tags: ["AI", "SLM", "edge", "on-device", "foundation-model"],
    });
    const enriched = await buildEnriched(stack.teamLeader);
    await fs.writeFile(STATE_FILE, JSON.stringify(enriched, null, 2), "utf-8");
    console.error(JSON.stringify({ ok: true, slug: created.slug, alreadyExisted: created.alreadyExisted, stateFile: STATE_FILE, answers: Object.keys(enriched.answers).length }, null, 2));
    return;
  }

  if (cmd === "payload") {
    const robot = rest[0];
    const epicId = rest[1] || null;
    const { analysisId } = await rebuildSession(stack, slug);
    const result = await stack.teamLeader.runSingleRobot(analysisId, robot, {
      forceRerun: true,
      epicId,
    });
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  if (cmd === "save") {
    const robot = rest[0];
    const mdfile = rest[1];
    const epicId = rest[2] || null;
    const md = await fs.readFile(mdfile, "utf-8");
    const rel = await stack.teamLeader.assetStore.saveRobotOutput(
      slug,
      robot,
      md,
      md, // html fallback — renderer wraps it
      { epicId, author: "PM Anand (Claude-authored)" }
    );
    console.error(JSON.stringify({ ok: true, robot, savedTo: rel }, null, 2));
    return;
  }

  if (cmd === "gate") {
    const blocked = await stack.teamLeader.checkPhase2Gate(slug);
    const fresh = await stack.teamLeader.freshness.getRobotFreshness(slug);
    console.error(JSON.stringify({ blocked, freshness: fresh }, null, 2));
    return;
  }

  if (cmd === "promote") {
    const p2Path = stack.workspace.getPhase2ContextPath(slug);
    const manifest = {
      promotedAt: new Date().toISOString(),
      promotedFromPhase1: [...ROBOT_ORDER_BUSINESS, ...ROBOT_ORDER_EPIC_STRATEGY],
      pddVersion: "1.0.0",
      pddStatus: "DRAFT",
      owner: { name: "Anand", role: "PM (new-bet owner)", email: "ashrivastava@lucidya.com" },
      links: { jira: "", tdd: "", figma: "", confluence: "" },
      techStack: "Sub-3B SLM, quantization/distillation, CoreML/NNAPI/ONNX/GGUF runtimes, cross-platform SDK, NPU acceleration",
      regions: "North America + EU first (data-residency), global thereafter",
      experimentClusterCount: 0,
    };
    await fs.writeFile(p2Path, JSON.stringify(manifest, null, 2), "utf-8");
    console.error(JSON.stringify({ ok: true, p2Path, manifest }, null, 2));
    return;
  }

  if (cmd === "pdd-payload") {
    const epicId = rest[0] || null;
    const payload = await stack.pddComposer.assemble(slug, epicId);
    process.stdout.write(JSON.stringify(payload, null, 2));
    return;
  }

  if (cmd === "save-pdd") {
    const jsonfile = rest[0];
    const epicId = rest[1] || null;
    let raw = await fs.readFile(jsonfile, "utf-8");
    raw = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const pddJson = JSON.parse(raw);
    if (!pddJson.meta?.productName || !pddJson.meta?.version) {
      throw new Error("PDD JSON missing meta.productName or meta.version");
    }
    const version = pddJson.meta.version;
    const pddDir = stack.workspace.getPDDDir(slug, epicId);
    await fs.mkdir(pddDir, { recursive: true });
    const jsonPath = path.join(pddDir, `pdd-${slug}-v${version}.json`);
    const mdPath = path.join(pddDir, `pdd-${slug}-v${version}.md`);
    const latestPath = path.join(pddDir, `pdd-${slug}-latest.md`);
    const md = renderMarkdown(pddJson);
    await Promise.all([
      fs.writeFile(jsonPath, JSON.stringify(pddJson, null, 2), "utf-8"),
      fs.writeFile(mdPath, md, "utf-8"),
      fs.writeFile(latestPath, md, "utf-8"),
    ]);
    let htmlPath = null;
    try {
      const html = renderHtml(pddJson);
      htmlPath = path.join(pddDir, `pdd-${slug}-v${version}.html`);
      await fs.writeFile(htmlPath, html, "utf-8");
    } catch (e) {
      console.error("HTML render skipped: " + e.message);
    }
    console.error(JSON.stringify({ ok: true, jsonPath, mdPath, latestPath, htmlPath }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error("DRIVER ERROR:", e.stack || e.message);
  process.exit(1);
});
