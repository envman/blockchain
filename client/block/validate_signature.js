const secp256k1 = require('secp256k1')

module.exports = (hash, sig, pub) => {
  const signature = Uint8Array.from(Buffer.from(sig, 'hex'))
  const hash_buffer = Buffer.from(hash, 'hex')
  const public_key = Uint8Array.from(Buffer.from(pub, 'hex'))

  return secp256k1.ecdsaVerify(signature, hash_buffer, public_key)
}