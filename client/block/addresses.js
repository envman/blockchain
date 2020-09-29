const fs = require('fs-extra')
const path = require('path')
const { get_random } = require('./utils')

module.exports = ({ data_dir }) => {
  const store_location = path.join(data_dir, 'addresses.json')

  return fs.exists(store_location)
    .then(exists => exists || fs.writeFile(store_location, JSON.stringify([])))
    .then(_ => fs.readFile(store_location, 'utf8'))
    .then(JSON.parse)
    .then(addresses => {
      return {
        add: address => {
          if (!addresses.find(x => x.port === address.port && x.ip === address.ip)) {
            addresses.push(address)
          }
      
          return fs.writeFile(store_location, JSON.stringify(addresses, null, 2))
        },
      
        get: count => {
          return get_random(addresses, count)
        }
      }
    })
}