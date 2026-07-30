import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function encryptionKey() {
  const encoded = process.env.ENCRYPTION_KEY;
  if (!encoded) throw new Error('ENCRYPTION_KEY must be set.');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return key;
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decryptSecret(value) {
  const payload = Buffer.from(value, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString('utf8');
}
