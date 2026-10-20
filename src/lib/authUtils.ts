/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LUCKYLY BACKEND AUTH & PASSWORD HASHING UTILITIES
 * Uses @node-rs/argon2 for secure Argon2id password hashing and verification.
 */

import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';

/**
 * Hash a plain password or secret using Argon2id.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return argon2Hash(plainText);
}

/**
 * Verify a plain password or secret against an Argon2id hash.
 */
export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  return argon2Verify(hash, plainText);
}
