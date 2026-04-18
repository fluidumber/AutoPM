<div align="center">

# 🚀 <span style="color: #6C63FF; font-family: 'Inter', sans-serif;">ProductFlow MCP v2.0</span> 🛠️
### <span style="color: #A78BFA; font-style: italic;">Your Agentic Product Management Engine</span>

<img src="https://img.shields.io/badge/Node.js-v18%2B-%23339933?style=flat-square&logo=node.js" alt="Node" />
<img src="https://img.shields.io/badge/MCP-Ready-%236C63FF?style=flat-square" alt="MCP" />
<img src="https://img.shields.io/badge/Claude_Code-Compatible-%23D97757?style=flat-square&logo=anthropic" alt="Claude" />

</div>

---

## 🌟 <span style="color: #22C55E;">Prerequisites</span>
Before unleashing your AI product manager, ensure you have:
- 🟢 **Node.js** (v18 or higher)
- 🧠 **Claude Code** installed globally (`npm install -g @anthropic/claude-code`)

---

## 🛠️ <span style="color: #3B82F6;">1. Installation & Setup</span>

Hop into your project directory and let's get the gears turning!

```bash
cd /Users/anandshrivastava/anewapp/productflow
npm install
```

Make your CLI universally accessible by linking it:
```bash
npm link
```
> <span style="color: #8B8FA3;">*Magic trick: This creates a symlink, so you can summon `productflow` from anywhere!* ✨</span>

**Verify the Engine:**
```bash
productflow --version
# Should greet you with the version number!
```

---

## 🤝 <span style="color: #F59E0B;">2. Connecting to Claude Code</span>

Time to introduce ProductFlow to Claude via the Model Context Protocol (MCP) using a standard `stdio` connection. 

Since you cast `npm link`, you can wire it up with this magic spell:

```bash
claude mcp add productflow productflow mcp
```

### 🎯 Verification check
Fire up `claude mcp list`, and look for the green check of success!
```text
productflow: productflow mcp - ✓ Connected
```

---

## 🎮 <span style="color: #EC4899;">3. How to Play (The Workflow)</span>

ProductFlow v2.0 isn't just a script—it's a multi-step, interactive dance between you and the AI.

### 🎭 The Trigger
Launch Claude (`claude`) and plant the seed:
> **<span style="color: #A78BFA;">"Use ProductFlow to analyze my idea for an AI fitness coaching app."</span>**

### 🎙️ Phase 1: The Interactive Interview
1. Claude consults the `interview` tool and begins a **PM-style interrogation** (Geography, Segment, Competitors, Constraints).
2. **Smart Skips:** If you drop heavy knowledge early (e.g., mentioning *Peloton* and *B2C* in your first answer), the agent magically **auto-skips** redundant questions.
3. **Deep Dives:** Give a shallow answer? Expect a sharp, PM-style follow-up question to dig deeper! 🕵️‍♂️ 

### 🤖 Phase 2: The Sequential Robot Relay
Once context is locked in, the robots take turns performing analysis:
<p>
  <span style="color: #3B82F6;">🔍 Scout (Market)</span> ➡️ 
  <span style="color: #EAB308;">🔎 Detective (Competition)</span> ➡️ 
  <span style="color: #8B5CF6;">👥 People (Personas)</span> ➡️ 
  <span style="color: #10B981;">💰 Money (Financials)</span> ➡️ 
  <span style="color: #F43F5E;">📝 Feature (Breakdown)</span> ➡️ 
  <span style="color: #06B6D4;">🗺️ Plan (Roadmap)</span> ➡️ 
  <span style="color: #F97316;">⭐ Priority (RICE)</span>
</p>

### 📈 Phase 3: The User Feedback Loop
After *each* robot finishes its shift, Claude will ask for your thoughts. 
- Rate it **1 to 5 stars** 🌟
- Your feedback feeds the `brain-database.json`. High scores build standard templates; low scores generate **Improvement Hints** for the next run! 🧠

### 🎬 Phase 4: Showtime (Presentation Generation)
Once the gauntlet is complete, Claude automatically hits `generate-presentation`.
- A beautifully crafted, dark-themed `.html` presentation is birthed into the `./plans/` folder.
- Pop it open in any browser and bask in your product strategy! 📊

---

## 🧹 <span style="color: #EF4444;">4. Managing the "Brain"</span>

Want to wipe the slate clean or stroll down memory lane?

**Clear all data & learnings:**
> *"Ask ProductFlow to reset the database."*

**Retrieve history:**
> *"List the history of past ProductFlow analyses."*

---

## 🚑 <span style="color: #64748B;">5. Troubleshooting / Quick Fixes</span>

| Issue | Solution |
| :--- | :--- |
| **Claude says "Failed to Connect"** | 1. Ensure you ran `npm link`.<br>2. Run `productflow mcp` manually in terminal; it should await input without crashing. |
| **Code changes aren't updating** | MCP processes stay alive in Claude! Type `/exit` inside Claude and restart to reload your shiny new code. |

<br>
<div align="center">
  <i><span style="color: #6C63FF;">Built with 💻 and ☕ for visionary Product Managers.</span></i>
</div>
