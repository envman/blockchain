const sha256 = require('sha256')

const h = obj => sha256.x2(JSON.stringify(obj))

let test = {
  nonce: 1,
  actions: [

  ]
}

const hash = h(test)
console.log('hash', hash)

const number = BigInt(`0x${hash}`)
const number_more = BigInt(`0x${hash}`) + BigInt(1)

console.log('result', number < number_more)