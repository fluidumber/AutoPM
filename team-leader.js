// This is the leader that tells robots what to do

import ScoutRobot from './scout-robot.js';
import RobotMemory from './robot-memory.js';

class TeamLeader {
    constructor() {
        // Create all the robots
        this.scout = new ScoutRobot();
        this.memory = new RobotMemory();

        console.log("👑 Team Leader: All robots ready!");
    }

    // Main job: take a problem and solve it
    async solveProblem(productIdea) {
        console.log(`\n👑 Team Leader: "Let's analyze: ${productIdea}"\n`);

        // Step 1: Check memory - have we solved something like this before?
        const similarMemories = this.memory.findSimilar(productIdea);

        if (similarMemories.length > 0) {
            console.log(`👑 Team Leader: "We've done this before! Let's use that!"`);
        }

        // Step 2: Call the Scout Robot
        console.log(`👑 Team Leader: "Scout Robot, go analyze the market!"\n`);
        const analysis = await this.scout.checkMarketDemand(productIdea);

        // Step 3: Save what we learned
        this.memory.remember(`Analyzed ${productIdea}: ${analysis.summary}`);

        // Step 4: Return the answer
        console.log(`👑 Team Leader: "Done! Here's your answer:"`);
        return analysis;
    }

    // Show all the memories
    showWhatWeLearned() {
        console.log("\n📚 What our team has learned:");
        this.memory.showAll();
    }
}

export default TeamLeader;