
const extractDimensionsFromString = (text) => {
    if (!text) return null;

    // Pattern 1: Explicit "1.22x50", "1,22x50", "152x50"
    // Matches: (1.22 or 1,22 or 0.60 or 152) [xX] (50)
    const matchX = text.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+)/);
    if (matchX) {
        let widthRaw = matchX[1].replace(',', '.');
        let width = parseFloat(widthRaw);
        let length = parseInt(matchX[2]);

        // Normalize width: if > 10, assume cm and convert to m (e.g. 152cm -> 1.52m)
        // Unless it's likely meters (e.g. 1.22)
        if (width >= 10) width = width / 100;

        return { width, length };
    }

    // Pattern 2: Combined "12250" (3 digits cm + 2 digits m)
    // Only applied if text looks like a reference code (no spaces/words attached tightly)
    const matchCombined = text.match(/\b(\d{3})(50|25|10|05|30)\b/);
    if (matchCombined) {
        return { width: parseInt(matchCombined[1]) / 100, length: parseInt(matchCombined[2]) };
    }

    return null;
};

const testCases = [
    "VINILO ESMERILADO PTA 1,22x50",
    "VINILO ESMERILADO PTA 1.22x50",
    "RI-MARK PTA 152X50",
    "12250",
    "03529 12250",
    "Random Text 105x50",
    "Text 1,05 x 50",
    "Text 10050",
    "No Dimensions Here"
];

testCases.forEach(ref => {
    const res = extractDimensionsFromString(ref);
    const width = res ? res.width : 'null';
    const length = res ? res.length : 'null';
    console.log(`'${ref}': ${width} x ${length}`);
});
