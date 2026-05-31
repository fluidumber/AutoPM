const fs = require('fs');
const path = require('path');
const p = path.join(process.env.HOME, '.productflow/products/styleiq-ai-wardrobe-style-co-pilot/assets/asks/core/2026-05-30-epic-output.md');
let content = fs.readFileSync(p, 'utf-8');
if (!content.includes('```json')) {
  const jsonBlock = `
\`\`\`json
{
  "epics": [
    {"id": "E1", "name": "Smart Wardrobe Cataloguing"},
    {"id": "E2", "name": "Daily Outfit Intelligence"},
    {"id": "E3", "name": "Style Profile & Personalisation Engine"},
    {"id": "E4", "name": "Merchant & Affiliate Commerce Layer"},
    {"id": "E5", "name": "Social Sharing & Community"},
    {"id": "E6", "name": "Freemium Subscription & Monetisation Rails"}
  ]
}
\`\`\`
`;
  content += "\n\n" + jsonBlock;
  fs.writeFileSync(p, content, 'utf-8');
  console.log("JSON appended to epic-output.md");
}
