// Robot Memory - Where robots learn
class RobotMemory {
    constructor() {
        this.memories = [];
        console.log("🧠 Memory System: Ready!\n");
    }

    // Save a memory
    remember(whatHappened, howGood = 0.8) {
        const memory = {
            id: this.memories.length + 1,
            what: whatHappened,
            score: howGood,
            when: new Date().toLocaleString()
        };

        this.memories.push(memory);
        console.log(`💾 Saved to memory: "${whatHappened}"`);
        return memory;
    }

    // Find similar memories
    findSimilar(newIdea) {
        const firstWord = newIdea.split(' ')[0];
        const similar = this.memories.filter(mem =>
            mem.what.includes(firstWord)
        );
        return similar;
    }

    // Show all memories
    showAll() {
        console.log("\n📚 === ROBOT MEMORIES ===");
        if (this.memories.length === 0) {
            console.log("No memories yet!");
            return;
        }
        this.memories.forEach(mem => {
            console.log(`  #${mem.id}: "${mem.what}" (Score: ${mem.score})`);
        });
    }

    // Get best memory by score
    getBest() {
        if (this.memories.length === 0) return null;
        return this.memories.reduce((best, current) =>
            current.score > best.score ? current : best
        );
    }
}

export default RobotMemory;