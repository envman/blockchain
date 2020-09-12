const fs = require('fs-extra')
const path = require('path')
const client = require('./client')

// const user_options = JSON.parse(fs.readFileSync(path.join(__dirname, 'options.json')))

const user_options = {
  web_port: 8081,
  username: 'ENVMAN',
  port: 9002,
  wipe: false,
  data_root: path.join(__dirname, '..', 'player_data'),
}

client(user_options)