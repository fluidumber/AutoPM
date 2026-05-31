import { WorkspaceManager } from "./src/workspace/workspace-manager.js";
import { AssetStore } from "./src/workspace/asset-store.js";

async function main() {
    const ws = new WorkspaceManager();
    const store = new AssetStore(ws);

    const md = `
# Markdown Test
Here is a chart:
\`\`\`html
<canvas id="myChart" width="400" height="200"></canvas>
<script>
  setTimeout(() => {
    const ctx = document.getElementById('myChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
        datasets: [{
          label: '# of Votes',
          data: [12, 19, 3, 5, 2, 3],
          borderWidth: 1
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }, 100);
</script>
\`\`\`

And a mermaid block:
\`\`\`mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
\`\`\`
    `;

    const path = await store.saveRobotOutput("styleiq-ai-wardrobe-style-co-pilot", "detective", md, { author: "Anand" });
    console.log("Saved to", path);
}

main().catch(console.error);
