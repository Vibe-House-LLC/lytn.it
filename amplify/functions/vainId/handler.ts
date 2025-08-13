import { createHash } from 'crypto';
import type { Schema } from '../../data/resource';
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from "$amplify/env/vainId";

const SEED = 'lytnit';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
    env
);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

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


/**
 * Get next iteration number
 */
async function getIteration(): Promise<number> {
    try {
        console.log('Getting iteration for seed:', SEED);

        // Try to find existing iterator by seed
        const existing = await client.models.iterator.get({
            id: SEED
        })

        if (existing?.data) {
            // Update existing iterator
            const currentIterator = existing.data;
            const newIteration = (currentIterator.iteration || 0) + 1;
            const updated = await client.models.iterator.update({
                id: currentIterator.id,
                iteration: newIteration
            });

            console.log('Updated iterator result:', JSON.stringify(updated, null, 2));
            return updated.data?.iteration || 1;
        } else {
            // Create new iterator
            console.log('Creating new iterator with iteration 1');
            const created = await client.models.iterator.create({
                id: SEED,
                iteration: 1
            });

            console.log('Created iterator result:', JSON.stringify(created, null, 2));
            return created.data?.iteration || 1;
        }
    } catch (error) {
        console.error('Error managing iteration:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));

        // Use a more random fallback
        const fallback = Math.floor(Math.random() * 1000) + Date.now() % 10000;
        console.log('Using fallback iteration:', fallback);
        return fallback;
    }
}

export const handler: Schema['vainId']['functionHandler'] = async (event) => {
    const { warmup } = event.arguments;

    if (warmup) {
        return null;
    }

    try {
        const iteration = await getIteration();
        const id = generateId(iteration, SEED);
        return { id };
    } catch (error) {
        console.error('Error generating ID:', error);
        throw error;
    }
};
