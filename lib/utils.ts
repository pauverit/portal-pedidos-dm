import { Product } from '../types';

/**
 * Extracts width and length dimensions from a string (such as a product reference or name).
 * It looks for patterns like "1.22x50", "152x50", or combined reference codes like "12250".
 */
export const extractDimensionsFromString = (text: string): { width: number, length: number } | null => {
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

/**
 * Detects if a product is a vinyl based on its name or subcategory.
 */
export const isVinyl = (product: { name: string, subcategory?: string }): boolean => {
    const name = product.name.toLowerCase();
    const subcat = product.subcategory?.toLowerCase() || '';
    return name.includes('vinil') || subcat.includes('vinil');
};

/**
 * Detects if a product is a laminate based on its name or subcategory.
 */
export const isLaminate = (product: { name: string, subcategory?: string }): boolean => {
    const name = product.name.toLowerCase();
    const subcat = product.subcategory?.toLowerCase() || '';
    return name.includes('laminad') || subcat.includes('laminad');
};

/**
 * Detects if a product is a lona based on its name or subcategory.
 */
export const isLona = (product: { name: string, subcategory?: string }): boolean => {
    const name = product.name.toLowerCase();
    const subcat = product.subcategory?.toLowerCase() || '';
    return name.includes('lona') || subcat.includes('lona');
};

/**
 * Extracts weight in grams from a descriptive text, usually for Lonas.
 */
export const extractLonaWeight = (description: string): number => {
    // Look for patterns like "280gr", "340 gr/m2", "450gr/m²", etc.
    const match = description.match(/(\d+)\s*gr/i);
    return match ? parseInt(match[1]) : 0;
};

/**
 * Calculates the weight (in kg) of a product based on its dimensions and material type.
 * Prioritizes explicitly provided width/length, but falls back to extracting them from the reference/name.
 */
export const calculateWeight = (
    product: Pick<Product, 'reference' | 'name' | 'subcategory' | 'description' | 'width' | 'length' | 'weight'>
): number => {
    let width = product.width || 0;
    let length = product.length || 0;

    // Try to extract dimensions from reference OR name if missing
    if (!width || !length) {
        // Try reference first
        let dims = extractDimensionsFromString(product.reference);

        // If not found in reference, try name
        if (!dims) {
            dims = extractDimensionsFromString(product.name);
        }

        if (dims) {
            width = dims.width;
            length = dims.length;
        }
    }

    if (!width || !length) {
        return product.weight || 0;
    }

    const areaM2 = width * length;
    let gramsPerM2 = 0;

    if (isVinyl(product)) {
        gramsPerM2 = 130;
    } else if (isLaminate(product)) {
        gramsPerM2 = 100;
    } else if (isLona(product)) {
        gramsPerM2 = extractLonaWeight(product.description || '');
    }

    if (gramsPerM2 === 0) {
        return product.weight || 0;
    }

    // Convert grams to kg
    const finalWeight = parseFloat(((areaM2 * gramsPerM2) / 1000).toFixed(3));
    return finalWeight;
};
