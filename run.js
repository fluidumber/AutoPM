// This is the main file - RUN THIS!
import TeamLeader from './leader/team-leader.js';

async function main() {
    // Create the team leader
    const leader = new TeamLeader();

    // Ask the team to analyze a product
    const productIdea = "A mobile app that helps students study smarter";

    console.log("🚀 Starting ProductFlow analysis...\n");

    // Run the analysis
    const results = await leader.analyzeBusiness(productIdea);

    // Show summary
    leader.showSummary();

    console.log("\n✅ Analysis complete!");
}

// Run it!
main().catch(console.error);