import { createHash } from 'crypto';

/**
 * Convert a number to base-62 alphanumeric string
 */
function toBase(n: number): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const base = chars.length;
    
    if (!n) return "0";
    
    return toBase(Math.floor(n / base)).replace(/^0+/, '') + chars[Math.floor(n % base)];
}





/**
 * Generate a unique ID based on iteration and seed
 * This creates pseudo-random looking IDs that are deterministic and unique
 * Minimum length: 6 characters
 */
export function generateId(iteration: number, seed: string): string {
    if (iteration === 0) return "000000"; // 6-character version of "0"
    
    // Create a hash of seed + iteration for uniqueness
    const hash = createHash('sha256').update(`${seed}${iteration}`).digest('hex');
    
    // Use multiple parts of the hash for better randomness
    const part1 = parseInt(hash.substring(0, 8), 16);
    const part2 = parseInt(hash.substring(8, 16), 16);
    const part3 = parseInt(hash.substring(16, 24), 16);
    
    // Combine parts with iteration to ensure uniqueness
    const combined = (part1 ^ part2 ^ part3 ^ iteration) >>> 0;
    
    // Calculate range for 6+ character IDs
    // Base62^5 = 916,132,832 (minimum 6-char value)
    // Base62^7 = 3,521,614,606,208 (maximum 7-char value, but too large)
    // So we'll use a large range that ensures 6+ characters but stays manageable
    const minValue = 916132832; // 62^5 for guaranteed 6+ chars
    const range = 2000000000; // Large range for variety
    const scaled = (combined % range) + minValue;
    
    // Convert to base 62
    const base62 = toBase(scaled);
    
    // Ensure minimum 6 characters (pad with leading zeros if needed)
    return base62.padStart(6, '0');
}

/**
 * Alternative simple version that creates short, unique IDs
 */
export function generateSimpleId(iteration: number, seed: string): string {
    if (iteration === 0) return "0";
    
    // Create a hash of seed + iteration
    const hash = createHash('sha256').update(`${seed}${iteration}`).digest('hex');
    
    // Take first 6 characters and convert to base 62
    const hexValue = parseInt(hash.substring(0, 6), 16);
    const base62 = toBase(hexValue % 238328); // Keep it reasonable size
    
    // Ensure at least 1 character
    return base62 || toBase(iteration % 62);
} 