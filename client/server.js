const fs = require('fs-extra')
const path = require('path')
const createGame = require('./block/game')

const opts = {
  port: 9000,
  miner: true,
  username: 'origin',
  data_root: path.join(__dirname, '..', 'miner_data'),
  wipe: true
}

createGame(opts)
  .then(game => {
  })