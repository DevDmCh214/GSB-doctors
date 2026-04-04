/**
 * Generate self-signed TLS certificate for local HTTPS development.
 * Uses Node.js built-in crypto — no external tools required (no openssl, mkcert, etc.).
 *
 * Usage: node certs/generate.js
 * Output: certs/key.pem + certs/cert.pem (valid 365 days, CN=localhost)
 */
const { execSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const keyPath = path.join(__dirname, 'key.pem')
const certPath = path.join(__dirname, 'cert.pem')

// Skip if certs already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ Certificats déjà présents (certs/key.pem, certs/cert.pem)')
  process.exit(0)
}

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

// Try openssl first (available in Git Bash on Windows, most Linux/Mac systems)
try {
  fs.writeFileSync(keyPath, privateKey)
  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`,
    { stdio: 'pipe' }
  )
  console.log('✅ Certificats générés avec openssl (certs/key.pem, certs/cert.pem)')
  process.exit(0)
} catch {
  // openssl not available, fall back to pure Node.js self-signed cert
}

// Fallback: create a minimal self-signed cert using Node's crypto
// This creates a basic X.509 v1 cert (sufficient for local dev HTTPS)
const forge = (() => {
  // Inline minimal ASN.1/DER cert builder — no npm dependency
  function intBytes(n) {
    const hex = n.toString(16)
    const padded = hex.length % 2 ? '0' + hex : hex
    const bytes = Buffer.from(padded, 'hex')
    // Add leading 0x00 if high bit set (positive integer)
    if (bytes[0] & 0x80) return Buffer.concat([Buffer.from([0]), bytes])
    return bytes
  }

  function derLength(len) {
    if (len < 128) return Buffer.from([len])
    if (len < 256) return Buffer.from([0x81, len])
    return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff])
  }

  function derSeq(buffers) {
    const body = Buffer.concat(buffers)
    return Buffer.concat([Buffer.from([0x30]), derLength(body.length), body])
  }

  function derSet(buffers) {
    const body = Buffer.concat(buffers)
    return Buffer.concat([Buffer.from([0x31]), derLength(body.length), body])
  }

  function derInt(n) {
    const bytes = intBytes(n)
    return Buffer.concat([Buffer.from([0x02]), derLength(bytes.length), bytes])
  }

  function derBigInt(buf) {
    let b = buf
    if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0]), b])
    return Buffer.concat([Buffer.from([0x02]), derLength(b.length), b])
  }

  function derOid(oidStr) {
    const parts = oidStr.split('.').map(Number)
    const bytes = [40 * parts[0] + parts[1]]
    for (let i = 2; i < parts.length; i++) {
      let v = parts[i]
      if (v < 128) { bytes.push(v) }
      else {
        const enc = []
        enc.push(v & 0x7f)
        v >>= 7
        while (v > 0) { enc.push(0x80 | (v & 0x7f)); v >>= 7 }
        enc.reverse()
        bytes.push(...enc)
      }
    }
    const buf = Buffer.from(bytes)
    return Buffer.concat([Buffer.from([0x06]), derLength(buf.length), buf])
  }

  function derUtf8(str) {
    const buf = Buffer.from(str, 'utf8')
    return Buffer.concat([Buffer.from([0x0c]), derLength(buf.length), buf])
  }

  function derBitString(buf) {
    const body = Buffer.concat([Buffer.from([0x00]), buf])
    return Buffer.concat([Buffer.from([0x03]), derLength(body.length), body])
  }

  function derExplicit(tag, content) {
    return Buffer.concat([Buffer.from([0xa0 | tag]), derLength(content.length), content])
  }

  function derUtcTime(date) {
    const s = date.toISOString().replace(/[-:T]/g, '').substring(2, 14) + 'Z'
    const buf = Buffer.from(s, 'ascii')
    return Buffer.concat([Buffer.from([0x17]), derLength(buf.length), buf])
  }

  return { derSeq, derSet, derInt, derBigInt, derOid, derUtf8, derBitString, derExplicit, derUtcTime }
})()

// Parse the public key DER from PEM
const pubDer = Buffer.from(
  publicKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''),
  'base64'
)

// Build TBS (To Be Signed) Certificate
const now = new Date()
const notAfter = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

const issuer = forge.derSeq([
  forge.derSet([forge.derSeq([forge.derOid('2.5.4.3'), forge.derUtf8('localhost')])])
])

const tbs = forge.derSeq([
  forge.derExplicit(0, forge.derInt(2)),                          // version v3
  forge.derBigInt(crypto.randomBytes(16)),                         // serial
  forge.derSeq([forge.derOid('1.2.840.113549.1.1.11'), Buffer.from([0x05, 0x00])]), // sha256WithRSA
  issuer,
  forge.derSeq([forge.derUtcTime(now), forge.derUtcTime(notAfter)]),
  issuer,                                                          // subject = issuer (self-signed)
  pubDer,
])

// Sign TBS with private key
const sign = crypto.createSign('SHA256')
sign.update(tbs)
const signature = sign.sign(privateKey)

// Build full certificate
const cert = forge.derSeq([
  tbs,
  forge.derSeq([forge.derOid('1.2.840.113549.1.1.11'), Buffer.from([0x05, 0x00])]),
  forge.derBitString(signature),
])

const certPem = '-----BEGIN CERTIFICATE-----\n' +
  cert.toString('base64').match(/.{1,64}/g).join('\n') +
  '\n-----END CERTIFICATE-----\n'

fs.writeFileSync(keyPath, privateKey)
fs.writeFileSync(certPath, certPem)
console.log('✅ Certificats auto-signés générés (certs/key.pem, certs/cert.pem)')
