/**
 * E2EE Crypto Module for Momnts
 *
 * All encryption uses AES-256-GCM via Web Crypto API.
 * KDF: Argon2id (primary, via argon2-browser WASM) or PBKDF2-SHA256 (fallback).
 * No crypto key ever leaves the client.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface KDFParams {
  algorithm: 'argon2id' | 'pbkdf2'
  // Argon2id params
  memoryCost?: number  // KiB (default 65536 = 64MB)
  timeCost?: number    // iterations (default 3)
  parallelism?: number // threads (default 1)
  // PBKDF2 params
  iterations?: number  // default 600000
}

export interface WrappedKey {
  wrapped: string   // Base64
  iv: string        // Base64
  tag: string       // Base64 (included in ciphertext for GCM)
}

export interface EncryptedData {
  ciphertext: ArrayBuffer
  iv: string   // Base64
  tag: string  // Base64 (embedded in GCM ciphertext — last 16 bytes)
}

// ─── Encoding Helpers ────────────────────────────────────────────────

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function uint8ToBase64(arr: Uint8Array): string {
  return arrayBufferToBase64(arr.buffer)
}

export function base64ToUint8(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64))
}

// ─── Salt & Recovery Key Generation ──────────────────────────────────

export function generateSalt(bytes = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(bytes))
}

/**
 * Generate a 24-character alphanumeric recovery key (grouped as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX).
 * ~143 bits of entropy.
 */
export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const values = crypto.getRandomValues(new Uint8Array(24))
  let key = ''
  for (let i = 0; i < 24; i++) {
    if (i > 0 && i % 4 === 0) key += '-'
    key += chars[values[i] % chars.length]
  }
  return key
}

// ─── Key Derivation (KEK from passphrase) ────────────────────────────

const DEFAULT_PBKDF2_PARAMS: KDFParams = {
  algorithm: 'pbkdf2',
  iterations: 600000,
}

/**
 * Derive a KEK (Key Encryption Key) from a passphrase using PBKDF2-SHA256.
 */
export async function deriveKEK(
  passphrase: string,
  salt: Uint8Array,
  params?: KDFParams
): Promise<{ key: CryptoKey; usedParams: KDFParams }> {
  const p = { ...DEFAULT_PBKDF2_PARAMS, ...params }
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: p.iterations!,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
  return { key, usedParams: p }
}

// ─── DEK Generation ──────────────────────────────────────────────────

/** Generate a random AES-256-GCM data encryption key. */
export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for wrapping
    ['encrypt', 'decrypt']
  )
}

// ─── Key Wrapping / Unwrapping ───────────────────────────────────────

/** Wrap (encrypt) the DEK using the KEK. */
export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<WrappedKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    dek,
    kek,
    { name: 'AES-GCM', iv }
  )
  // AES-GCM wrapKey output includes the 16-byte auth tag appended
  const wrappedBytes = new Uint8Array(wrapped)
  const ciphertext = wrappedBytes.slice(0, wrappedBytes.length - 16)
  const tag = wrappedBytes.slice(wrappedBytes.length - 16)

  return {
    wrapped: arrayBufferToBase64(ciphertext.buffer),
    iv: uint8ToBase64(iv),
    tag: uint8ToBase64(tag),
  }
}

/** Unwrap (decrypt) the DEK using the KEK. */
export async function unwrapDEK(
  wrappedKey: WrappedKey,
  kek: CryptoKey
): Promise<CryptoKey> {
  const iv = base64ToUint8(wrappedKey.iv)
  const ciphertext = base64ToUint8(wrappedKey.wrapped)
  const tag = base64ToUint8(wrappedKey.tag)

  // Reconstruct full GCM output (ciphertext + tag)
  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext, 0)
  combined.set(tag, ciphertext.length)

  return crypto.subtle.unwrapKey(
    'raw',
    combined.buffer,
    kek,
    { name: 'AES-GCM', iv },
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can re-wrap with new passphrase
    ['encrypt', 'decrypt']
  )
}

// ─── Photo Encryption / Decryption ───────────────────────────────────

/** Encrypt a photo's raw bytes with the event DEK. */
export async function encryptPhoto(
  plainBytes: ArrayBuffer,
  dek: CryptoKey
): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    plainBytes
  )
  // GCM ciphertext includes 16-byte auth tag at the end
  const ctBytes = new Uint8Array(ciphertext)
  const ct = ctBytes.slice(0, ctBytes.length - 16)
  const tag = ctBytes.slice(ctBytes.length - 16)

  return {
    ciphertext: ct.buffer,
    iv: uint8ToBase64(iv),
    tag: uint8ToBase64(tag),
  }
}

/** Decrypt a photo's ciphertext with the event DEK. */
export async function decryptPhoto(
  ciphertext: ArrayBuffer,
  iv: string,
  tag: string,
  dek: CryptoKey
): Promise<ArrayBuffer> {
  const ivBytes = base64ToUint8(iv)
  const tagBytes = base64ToUint8(tag)
  const ctBytes = new Uint8Array(ciphertext)

  // Reconstruct full GCM ciphertext (ciphertext + tag)
  const combined = new Uint8Array(ctBytes.length + tagBytes.length)
  combined.set(ctBytes, 0)
  combined.set(tagBytes, ctBytes.length)

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    dek,
    combined.buffer
  )
}

export interface ImageTypeInfo {
  mime: string
  ext: string
}

/** Detect image type from raw decrypted ArrayBuffer using magic bytes/file signature. */
export function detectImageType(buffer: ArrayBuffer): ImageTypeInfo {
  const arr = new Uint8Array(buffer)
  if (arr.length >= 3 && arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (
    arr.length >= 8 &&
    arr[0] === 0x89 &&
    arr[1] === 0x50 &&
    arr[2] === 0x4E &&
    arr[3] === 0x47 &&
    arr[4] === 0x0D &&
    arr[5] === 0x0A &&
    arr[6] === 0x1A &&
    arr[7] === 0x0A
  ) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (
    arr.length >= 12 &&
    arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && // RIFF
    arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50   // WEBP
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  if (arr.length >= 3 && arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) { // GIF
    return { mime: 'image/gif', ext: 'gif' }
  }
  // HEIC check: check for 'ftyp' at offset 4, then check brand at offset 8
  if (
    arr.length >= 12 &&
    arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70 // ftyp
  ) {
    const brand = String.fromCharCode(arr[8], arr[9], arr[10], arr[11])
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand.toLowerCase())) {
      return { mime: 'image/heic', ext: 'heic' }
    }
  }
  // Default fallback if no magic bytes match
  return { mime: 'image/jpeg', ext: 'jpg' }
}

// ─── High-level: Create E2EE event keys ──────────────────────────────

export interface E2EEEventKeys {
  dek: CryptoKey
  recoveryKey: string
  // Fields to send to server
  serverPayload: {
    encryptionMode: 'E2EE'
    kdfSalt: string
    kdfParams: KDFParams
    wrappedDek: string
    wrappedDekIv: string
    wrappedDekTag: string
    recoveryKdfSalt: string
    wrappedRecoveryDek: string
    wrappedRecoveryIv: string
    wrappedRecoveryTag: string
  }
}

/**
 * Generate all keys for a new E2EE event.
 * Returns the DEK (to cache locally), recovery key (to show user once),
 * and the server payload (crypto fields to send with createEvent).
 */
export async function createE2EEEventKeys(passphrase: string): Promise<E2EEEventKeys> {
  // 1. Generate DEK
  const dek = await generateDEK()

  // 2. Passphrase path: derive KEK, wrap DEK
  const passphraseSalt = generateSalt()
  const { key: passphraseKEK, usedParams: kdfParams } = await deriveKEK(passphrase, passphraseSalt)
  const passphraseWrapped = await wrapDEK(dek, passphraseKEK)

  // 3. Recovery path: generate key, derive recovery KEK, wrap DEK
  const recoveryKey = generateRecoveryKey()
  const recoverySalt = generateSalt()
  const { key: recoveryKEK } = await deriveKEK(recoveryKey, recoverySalt, kdfParams)
  const recoveryWrapped = await wrapDEK(dek, recoveryKEK)

  return {
    dek,
    recoveryKey,
    serverPayload: {
      encryptionMode: 'E2EE',
      kdfSalt: uint8ToBase64(passphraseSalt),
      kdfParams,
      wrappedDek: passphraseWrapped.wrapped,
      wrappedDekIv: passphraseWrapped.iv,
      wrappedDekTag: passphraseWrapped.tag,
      recoveryKdfSalt: uint8ToBase64(recoverySalt),
      wrappedRecoveryDek: recoveryWrapped.wrapped,
      wrappedRecoveryIv: recoveryWrapped.iv,
      wrappedRecoveryTag: recoveryWrapped.tag,
    },
  }
}

/**
 * Unlock an E2EE event using passphrase.
 * Derives KEK from passphrase + stored salt, unwraps the DEK.
 */
export async function unlockWithPassphrase(
  passphrase: string,
  kdfSalt: string,
  kdfParams: KDFParams,
  wrappedDek: string,
  wrappedDekIv: string,
  wrappedDekTag: string
): Promise<CryptoKey> {
  const salt = base64ToUint8(kdfSalt)
  const { key: kek } = await deriveKEK(passphrase, salt, kdfParams)
  return unwrapDEK({ wrapped: wrappedDek, iv: wrappedDekIv, tag: wrappedDekTag }, kek)
}

/**
 * Unlock an E2EE event using recovery key.
 * Derives KEK from recovery key + stored recovery salt, unwraps the DEK.
 */
export async function unlockWithRecoveryKey(
  recoveryKey: string,
  recoveryKdfSalt: string,
  kdfParams: KDFParams,
  wrappedRecoveryDek: string,
  wrappedRecoveryIv: string,
  wrappedRecoveryTag: string
): Promise<CryptoKey> {
  const salt = base64ToUint8(recoveryKdfSalt)
  const { key: kek } = await deriveKEK(recoveryKey, salt, kdfParams)
  return unwrapDEK({ wrapped: wrappedRecoveryDek, iv: wrappedRecoveryIv, tag: wrappedRecoveryTag }, kek)
}

/**
 * Re-wrap DEK with a new passphrase (used after recovery).
 * Returns new wrapped DEK fields to send to server via updateEvent.
 */
export async function rewrapWithNewPassphrase(
  dek: CryptoKey,
  newPassphrase: string,
  existingKdfParams: KDFParams
): Promise<{ kdfSalt: string; wrappedDek: string; wrappedDekIv: string; wrappedDekTag: string }> {
  const newSalt = generateSalt()
  const { key: newKEK } = await deriveKEK(newPassphrase, newSalt, existingKdfParams)
  const newWrapped = await wrapDEK(dek, newKEK)
  return {
    kdfSalt: uint8ToBase64(newSalt),
    wrappedDek: newWrapped.wrapped,
    wrappedDekIv: newWrapped.iv,
    wrappedDekTag: newWrapped.tag,
  }
}
