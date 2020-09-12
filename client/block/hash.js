const sha256 = require('sha256')

module.exports = obj => {
  return sha256.x2(JSON.stringify(obj))
}