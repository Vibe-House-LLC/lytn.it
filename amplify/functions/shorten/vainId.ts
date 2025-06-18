import { createHash } from 'crypto';

/**
 * Convert a number to base-62 alphanumeric string
 */
function toBase(n: number): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const base = chars.length;
    
    if (!n) return "0";
    
    const result = toBase(Math.floor(n / base)).replace(/^0+/, '') + chars[Math.floor(n % base)];
    return result;
}

/**
 * Calculate the greatest common divisor of two numbers
 */
function gcd(a: number, b: number): number {
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

/**
 * Create a generator that's coprime to the capacity
 */
function createGenerator(capacity: number, seed: string): number {
    const hashedSeed = parseInt(createHash('sha256').update(seed).digest('hex').substring(0, 8), 16);
    let generator = hashedSeed % Math.floor(capacity * 0.8); // Starting point
    
    while (gcd(generator, capacity) !== 1 && generator < capacity) {
        generator += 1; // Increment until we find a coprime generator
    }
    
    if (gcd(generator, capacity) !== 1) {
        throw new Error(`Could not find a 'generator' that is relatively prime to the capacity (${capacity})`);
    }
    
    return generator;
}

/**
 * Generate a unique ID based on iteration and seed using the VainID algorithm
 * This creates the shortest possible IDs while maintaining pseudo-randomness
 */
export function generateId(iteration: number, seed: string): string {
    // Determine required values
    let requiredDigits: number;
    try {
        // Determine the number of digits required for this iteration value
        requiredDigits = Math.ceil(Math.log(iteration + 1) / Math.log(62));
    } catch {
        requiredDigits = 1;
    }
    
    let unavailable: number;
    try {
        // Determine the capacity of the previous number of digits (how many are 'unavailable')
        unavailable = Math.ceil(Math.pow(62, requiredDigits - 1));
        if (unavailable === 1) {
            unavailable = 0;
        }
    } catch {
        unavailable = 0;
    }
    
    const capacity = Math.max(62, Math.ceil(Math.pow(62, requiredDigits)) - unavailable);
    const generator = createGenerator(capacity, seed);
    
    // Calculate the next id to generate and convert it to a base 62 alphanumeric string
    const calc = ((iteration - unavailable) * generator) % capacity + unavailable;
    const id = toBase(calc);
    
    return id;
} 