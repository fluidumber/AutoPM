# 🚀 Quick Start Guide (For Beginners)

Welcome to AutoPM! If you're not super technical and just want to get this running as fast as possible, you are in the right place. 

Follow these simple steps to get your AI Product Manager up and running.

---

### Step 1: Install Node.js
Your computer needs a program called **Node.js** to run this tool.
1. Go to [nodejs.org](https://nodejs.org/).
2. Download and install the **LTS (Long Term Support)** version.
3. Just click "Next" through the standard installation steps.

### Step 2: Prepare the Folder
1. Download or clone this AutoPM folder to your computer. (For example, to your Desktop or Documents).
2. Open your computer's **Terminal** (on Mac, press `Cmd + Space`, type "Terminal", and hit Enter).
3. In the Terminal, navigate to your folder. If it's on your Desktop, type:
   ```bash
   cd ~/Desktop/productflow
   ```
   *(Change "productflow" to whatever you named the folder)*
4. Install the required background packages by typing:
   ```bash
   npm install
   ```

### Step 3: Connect to your AI App
AutoPM doesn't have its own chat interface—it plugs directly into AI apps you already use (like Claude or Cursor).

#### Option A: Using Claude Desktop (Easiest)
1. Download the [Claude Desktop App](https://claude.ai/download) if you haven't already.
2. Open Claude Desktop.
3. On Mac, go to the top menu bar and click **Claude** -> **Settings...** -> **Developer** -> **Edit Config**.
4. This will open a configuration file. Add this code inside, but **replace the path** with the actual path to your folder:
   ```json
   {
     "mcpServers": {
       "productflow": {
         "command": "node",
         "args": ["/Users/YOUR_NAME/Desktop/productflow/src/mcp-server.js"]
       }
     }
   }
   ```
5. Save the file and **Restart Claude Desktop**.

#### Option B: Using Cursor (For Developers)
1. Open the [Cursor](https://cursor.com/) editor.
2. Go to **Settings** (gear icon) -> **Features** -> scroll down to **MCP**.
3. Click **+ Add New MCP Server**.
4. Set the Type to `command`.
5. Set the Name to `productflow`.
6. Set the Command to `node`.
7. Set the Args to the full path of the file, e.g., `/Users/YOUR_NAME/Desktop/productflow/src/mcp-server.js`.
8. Click Save.

### Step 4: Start Building!
Now that it's connected, open a new chat in Claude or Cursor and just say:

> *"Hey, please use the productflow interview tool to help me flesh out a new product idea."*

The AI will now take over, asking you questions and automatically triggering the robots to build your product plan! 🎉
