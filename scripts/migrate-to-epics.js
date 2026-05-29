import fs from 'fs/promises';
import path from 'path';
import { WorkspaceManager } from '../src/workspace/workspace-manager.js';
import { ROBOT_STALENESS_DAYS } from '../src/workspace/freshness-tracker.js';

const PHASE_2_ROBOTS = [
    "user-stories", "scope-spec", "feasibility-tech", "feasibility-design",
    "customer-journeys", "data-privacy", "gtm-readiness", "risks-registry",
    "kpis", "daci-stakeholders",
];

const PHASE_2_REGEX = new RegExp(`^(\\d{4}-\\d{2}-\\d{2})-(${PHASE_2_ROBOTS.join('|')})(?:(-[a-z]+))?\\.(md|json|html|xlsx)$`);
const PHASE_2_PAYLOAD_REGEX = new RegExp(`^(\\d{4}-\\d{2}-\\d{2})-(${PHASE_2_ROBOTS.join('|')})\\.md$`);

async function fileExists(p) {
    try { await fs.stat(p); return true; } catch { return false; }
}

async function main() {
    const workspace = new WorkspaceManager();
    const productsDir = workspace.getProductsDir();
    const onlySlug = process.argv[2] || null;

    let products;
    try {
        products = await fs.readdir(productsDir);
    } catch (e) {
        console.error("Could not read products directory:", e);
        return;
    }

    let migratedProducts = 0;

    for (const slug of products) {
        if (slug.startsWith('.')) continue;
        if (onlySlug && slug !== onlySlug) continue;

        const productDir = path.join(productsDir, slug);
        const freshnessPath = path.join(productDir, 'freshness.json');
        
        if (!(await fileExists(freshnessPath))) continue;

        let freshness;
        try {
            const raw = await fs.readFile(freshnessPath, 'utf-8');
            freshness = JSON.parse(raw);
        } catch (e) {
            console.error(`Failed to parse freshness.json for ${slug}`);
            continue;
        }

        freshness.robots = freshness.robots || {};
        freshness.epics = freshness.epics || {};

        let migratedAny = false;
        const legacyEpicId = "legacy-epic";

        // Check if there are any Phase 2 robots in the top-level robots object
        for (const robot of PHASE_2_ROBOTS) {
            if (freshness.robots[robot]) {
                if (!freshness.epics[legacyEpicId]) {
                    freshness.epics[legacyEpicId] = { robots: {}, features: {} };
                }

                // Move the entry
                const entry = freshness.robots[robot];
                
                // Rewrite assetPath if it exists and hasn't been moved
                if (entry.assetPath && !entry.assetPath.includes('epics/')) {
                    const filename = path.basename(entry.assetPath);
                    entry.assetPath = path.posix.join('assets', 'epics', legacyEpicId, filename);
                }

                freshness.epics[legacyEpicId].robots[robot] = entry;
                delete freshness.robots[robot];
                migratedAny = true;
            }
        }

        if (migratedAny) {
            await fs.writeFile(freshnessPath, JSON.stringify(freshness, null, 2), 'utf-8');
            console.log(`✅ Updated freshness.json for ${slug}`);
        }

        // Now move the files in assets/
        const assetsDir = path.join(productDir, 'assets');
        if (!(await fileExists(assetsDir))) continue;

        const epicDir = path.join(assetsDir, 'epics', legacyEpicId);
        let epicDirCreated = false;

        const assetFiles = await fs.readdir(assetsDir);
        for (const file of assetFiles) {
            if (PHASE_2_REGEX.test(file)) {
                if (!epicDirCreated) {
                    await fs.mkdir(epicDir, { recursive: true });
                    epicDirCreated = true;
                }

                const oldPath = path.join(assetsDir, file);
                const newPath = path.join(epicDir, file);
                
                try {
                    await fs.rename(oldPath, newPath);
                    console.log(`   Moved ${file} -> epics/${legacyEpicId}/${file}`);
                    migratedAny = true;
                } catch (e) {
                    console.error(`   Failed to move ${file}:`, e);
                }
            }
        }

        const backfilled = await backfillEpicFreshnessFromFiles({
            epicDir,
            freshness,
            legacyEpicId,
        });
        if (backfilled > 0) {
            await fs.writeFile(freshnessPath, JSON.stringify(freshness, null, 2), 'utf-8');
            console.log(`   Backfilled ${backfilled} Phase 2 freshness entries from epics/${legacyEpicId}`);
            migratedAny = true;
        }

        if (migratedAny) {
            migratedProducts++;
        }
    }

    console.log(`\n🎉 Migration complete. Migrated ${migratedProducts} products.`);
}

async function backfillEpicFreshnessFromFiles({ epicDir, freshness, legacyEpicId }) {
    if (!(await fileExists(epicDir))) return 0;

    const files = await fs.readdir(epicDir);
    const byRobot = new Map();

    for (const file of files) {
        const match = file.match(PHASE_2_PAYLOAD_REGEX);
        if (!match) continue;

        const [, date, robot] = match;
        const current = byRobot.get(robot);
        if (!current || file.localeCompare(current.file) > 0) {
            byRobot.set(robot, { file, date, robot });
        }
    }

    if (byRobot.size === 0) return 0;

    freshness.epics[legacyEpicId] = freshness.epics[legacyEpicId] || { robots: {}, features: {} };
    let count = 0;

    for (const { file, date, robot } of byRobot.values()) {
        if (freshness.epics[legacyEpicId].robots[robot]) continue;

        freshness.epics[legacyEpicId].robots[robot] = {
            lastRun: `${date}T12:00:00.000Z`,
            assetPath: path.posix.join('assets', 'epics', legacyEpicId, file),
            staleAfterDays: ROBOT_STALENESS_DAYS[robot] ?? 60,
        };
        count++;
    }

    return count;
}

main().catch(console.error);
