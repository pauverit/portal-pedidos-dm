
const extractDimensionsFromReference = (reference) => {
    // Pattern 1: Explicit "152x50" or "152X50"
    const matchX = reference.match(/(\d{3})[xX](\d{2})/);
    if (matchX) {
        return { width: parseInt(matchX[1]) / 100, length: parseInt(matchX[2]) };
    }

    // Pattern 2: Combined "12250" (3 digits cm + 2 digits m)
    const matchCombined = reference.match(/\b(\d{3})(\d{2})\b/);
    if (matchCombined) {
        return { width: parseInt(matchCombined[1]) / 100, length: parseInt(matchCombined[2]) };
    }

    return null;
};

const testCases = [
    "12250",
    "03529 12250",
    "RI-MARK PTA 152X50",
    "RI-MARK PTA 152x50",
    "VINILO 12250 PT",
    "RANDOM 123456", // Should not match 5 digits if not boundary?
    "10050", // 1.00 x 50
    "05225", // 0.52 x 25 ?
    "TMKBTBR106" // Should not match
];

testCases.forEach(ref => {
    console.log(`'${ref}':`, extractDimensionsFromReference(ref));
});
