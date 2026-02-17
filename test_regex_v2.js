
const extractDimensionsFromReference = (reference) => {
    // Pattern 1: Explicit "152x50" or "152X50"
    const matchX = reference.match(/(\d{3})[xX](\d{2})/);
    if (matchX) {
        return { width: parseInt(matchX[1]) / 100, length: parseInt(matchX[2]) };
    }

    // Pattern 2: Combined "12250" -> 1.22m x 50m
    // We look for 5 digits where the last 2 are standard lengths (50, 25, 10, 05, 30)
    // This avoids matching "03529" as 0.35x29
    const matchCombined = reference.match(/\b(\d{3})(50|25|10|05|30)\b/);
    if (matchCombined) {
        return { width: parseInt(matchCombined[1]) / 100, length: parseInt(matchCombined[2]) };
    }

    // Fallback: If no standard length found, but we find a 5-digit sequence starting with 1 (checking for 1xx width?)
    // Maybe best to stick to standard lengths to avoid false positives.

    return null;
};

const testCases = [
    "12250",
    "03529 12250",
    "RI-MARK PTA 152X50",
    "RI-MARK PTA 152x50",
    "VINILO 12250 PT",
    "05499 15250",
    "RANDOM 123456",
    "10050",
    "05225",
    "TMKBTBR106"
];

testCases.forEach(ref => {
    const res = extractDimensionsFromReference(ref);
    const width = res ? res.width : 'null';
    const length = res ? res.length : 'null';
    console.log(`'${ref}': ${width} x ${length}`);
});
