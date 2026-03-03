import { Product } from '../types';

/**
 * Hashes a password string using SHA-256 via the browser-native Web Crypto API.
 * Returns the hash as a hex string (64 chars).
 * NOTE: SHA-256 is not bcrypt — for a production system use a backend with bcrypt.
 * This is a significant improvement over plaintext for a learning/demo project.
 */
export const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    // Use window.crypto.subtle explicitly to avoid conflict with Node.js crypto module
    const subtle = (window.crypto || globalThis.crypto).subtle;
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Compares a plaintext password with a stored hash.
 * Works both if the stored value is a SHA-256 hex hash OR a legacy plaintext password.
 */
export const comparePassword = async (plain: string, stored: string): Promise<boolean> => {
    // If stored value looks like a SHA-256 hash (64 hex chars), compare as hash
    if (/^[a-f0-9]{64}$/.test(stored)) {
        const hashed = await hashPassword(plain);
        return hashed === stored;
    }
    // Legacy: plaintext comparison (to stay backwards-compatible)
    return plain === stored;
};


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

/**
 * Compresses an image file in the browser using Canvas API.
 * Resizes to max 1024px on the longest side and re-encodes as JPEG at 70% quality.
 * Typical result: 4-5 MB phone photo → 80-200 KB.
 */
export const compressImage = (file: File, maxPx = 1024, quality = 0.7): Promise<Blob> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const { width, height } = img;
            const scale = Math.min(1, maxPx / Math.max(width, height));
            const w = Math.round(width * scale);
            const h = Math.round(height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = url;
    });
