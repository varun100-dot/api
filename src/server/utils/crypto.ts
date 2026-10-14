import crypto from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16384, // CPU/memory cost
  r: 8,     // Block size
  p: 1,     // Parallelization
};

/**
 * Hash a password using Node.js scrypt with a unique cryptographically random salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Timing-safe verification of password against stored scrypt hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return resolve(false);
    }

    const salt = parts[1];
    const hash = parts[2];

    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const hashBuffer = Buffer.from(hash, 'hex');
        const match = crypto.timingSafeEqual(hashBuffer, derivedKey);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Generate a cryptographically secure random token (hex)
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a customer order reference, format: DIG-ORD-YYYYMMDD-XXXX
 */
export function generateOrderReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DIG-ORD-${dateStr}-${randomSuffix}`;
}

/**
 * Generate a production license key, format: DIG-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part4 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `DIG-${part1}-${part2}-${part3}-${part4}`;
}
