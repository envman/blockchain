const fs = require('fs-extra')
const path = require('path')
const { get_random } = require('./utils')

module.exports = ({ data_dir, test_mode }) => {
  const store_location = path.join(data_dir, 'addresses.json')

  return fs.exists(store_location)
    .then(exists => exists || fs.writeFile(store_location, JSON.stringify([])))
    .then(_ => fs.readFile(store_location, 'utf8'))
    .then(JSON.parse)
    .then(addresses => {
      return {
        add: ({ ip, port }) => {
          if (test_mode === 'true') {
            ip = '127.0.0.1'
          }

          if (!addresses.find(x => x.port === port && x.ip === ip)) {
            addresses.push({ ip, port })
          }
      
          return fs.writeFile(store_location, JSON.stringify(addresses, null, 2))
        },
      
        get: count => {
          return get_random(addresses, count).filter(x => x)
        }
      }
    })
    .catch(err => {
      console.error(`Error parsing addresses`)
      throw err
    })
}