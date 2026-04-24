// Shared keyword extraction — used by Scout and Detective robots
// to build clean search queries without brand name contamination.

const BASE_STOP_WORDS = new Set([
    // Articles, prepositions, conjunctions
    "a", "an", "the", "and", "or", "for", "to", "of", "in", "is",
    "are", "with", "that", "this", "we", "our", "it", "as", "on",
    "at", "by", "from", "into", "about", "between", "through",
    // Generic product/business words that add no search value
    "build", "create", "platform", "product", "feature", "tool",
    "users", "based", "using", "help", "helps", "want", "needs",
    "which", "have", "been", "will", "their", "they", "also",
    "smart", "best", "better", "good", "new", "first", "next",
    "make", "made", "making", "solution", "system", "service",
]);

/**
 * Extract clean domain keywords from text, excluding brand terms
 * and generic stop words. Returns up to 4 keywords joined by space.
 *
 * @param {string} text - Raw text to extract keywords from
 * @param {string[]} brandTerms - Brand names to exclude (e.g. ["xpertin", "ai"])
 * @returns {string} Space-separated domain keywords
 */
export function extractDomainKeywords(text, brandTerms = []) {
    const brandExclusions = new Set(brandTerms.map(b => b.toLowerCase()));

    const stopWords = new Set([
        ...BASE_STOP_WORDS,
        ...brandExclusions,
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));

    return [...new Set(words)].slice(0, 4).join(" ");
}
