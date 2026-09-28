import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto'
import {DatabaseConfigError} from './env'

/**
 * AES-256-GCM token encryption.
 * Format: `v1.<iv b64url>.<tag b64url>.<ciphertext b64url>`; AAD = `${provider}:${providerAccountId}`,
 * which binds a ciphertext to its account so it cannot be swapped onto another row.
 * Generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

export const TOKEN_FORMAT_VERSION = 'v1'
export const TOKEN_KEY_VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
const KEY_BYTES = 32

/** An opaque, validated 32-byte key. */
export interface EncryptionKey {
  readonly bytes: Buffer
  readonly version: number
}

export interface TokenBinding {
  provider: string
  providerAccountId: string
}

export class TokenDecryptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TokenDecryptionError'
  }
}

/** Parses a base64 (or base64url) key and checks it is exactly 32 bytes. */
export function parseEncryptionKey(source: string): EncryptionKey {
  const trimmed = source.trim()
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed)) {
    throw new DatabaseConfigError('encryption_not_configured', 'SOCIAL_TOKEN_ENCRYPTION_KEY must be base64.')
  }
  const bytes = Buffer.from(trimmed.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  if (bytes.length !== KEY_BYTES) {
    throw new DatabaseConfigError(
      'encryption_not_configured',
      `SOCIAL_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${bytes.length}).`,
    )
  }
  return {bytes, version: TOKEN_KEY_VERSION}
}

/** Returns a new random key in the expected base64 format. */
export function generateKey(): string {
  return randomBytes(KEY_BYTES).toString('base64')
}

function aad(binding: TokenBinding): Buffer {
  return Buffer.from(`${binding.provider}:${binding.providerAccountId}`, 'utf8')
}

export function encryptToken(plaintext: string, key: EncryptionKey, binding: TokenBinding): string {
  if (!plaintext) throw new Error('Refusing to encrypt an empty token.')
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key.bytes, iv, {authTagLength: TAG_BYTES})
  cipher.setAAD(aad(binding))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [TOKEN_FORMAT_VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function decryptToken(payload: string, key: EncryptionKey, binding: TokenBinding): string {
  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== TOKEN_FORMAT_VERSION) {
    throw new TokenDecryptionError('Unsupported encrypted token format.')
  }
  const [, ivPart = '', tagPart = '', dataPart = ''] = parts
  const iv = Buffer.from(ivPart, 'base64url')
  const tag = Buffer.from(tagPart, 'base64url')
  const data = Buffer.from(dataPart, 'base64url')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || data.length === 0) {
    throw new TokenDecryptionError('Malformed encrypted token.')
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key.bytes, iv, {authTagLength: TAG_BYTES})
    decipher.setAAD(aad(binding))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    // Never include key material or ciphertext in the error.
    throw new TokenDecryptionError('Token decryption failed (wrong key or tampered data).')
  }
}
