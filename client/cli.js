const client = require('./client')

const [test_mode, username, port, web_port, data_root, test_id, known] = process.argv.slice(2)

const opts = {
  wipe: false,
  miner: true,

  test_mode,
  username,
  port,
  web_port,
  data_root,
  known,
  test_id,
}

client(opts)
