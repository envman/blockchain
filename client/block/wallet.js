const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')
const sha256 = require('sha256')
const path = require('path')
const fs = require('fs-extra')

module.exports = () => {
  const wallet_folder = path.join(__dirname, 'wallet')

  return fs.mkdirp(wallet_folder)
    .then(_ => fs.readdir(wallet_folder))
    .then(files => files.filter(x => x.endsWith('.key')))
    .then(files => {

      return {
        create: () => {
          let key
          do {
            key = randomBytes(32)
          } while (!secp256k1.privateKeyVerify(key))

          return fs.writeFile(keyFile, key)
        },

        
      }
    })
}

// module.exports = ({ username }) => {
//   user = username || 'game'

//   const keyFile = path.join(__dirname, 'keys', `${user}.key`)

//   const create = () => {
//     let key
//     do {
//       key = randomBytes(32)
//     } while (!secp256k1.privateKeyVerify(key))

//     return fs.writeFile(keyFile, key)
//   }

//   return fs.mkdirp(path.join(__dirname, 'keys'))
//     .then(_ => fs.exists(keyFile))
//     .then(exists => exists || create())
//     .then(_ => fs.readFile(keyFile))
//     .then(key => {

//       const sign = hash => {
//         try {
//           const sig = secp256k1.ecdsaSign(Buffer.from(hash, 'hex'), key).signature
//           return Buffer.from(sig).toString('hex')
//         } catch (error) {
//           console.error(`Error signing ${hash}`)

//           throw error
//         }
//       }

//       const public = () => {
//         const public_key = secp256k1.publicKeyCreate(key)
//         return Buffer.from(public_key).toString('hex')
//       }

//       const verify = (hash, sig, pub) => {
//         const signature = Uint8Array.from(Buffer.from(sig, 'hex'))
//         const hash_buffer = Buffer.from(hash, 'hex')
//         const public_key = Uint8Array.from(Buffer.from(pub, 'hex'))

//         return secp256k1.ecdsaVerify(signature, hash_buffer, public_key)
//       }

//       return {
//         public,
//         sign,
//         verify,
//       }
//     })
// }