const net = require('net')
const { promisify } = require('util')
const { EventEmitter } = require('events')
const JsonSocket = require('json-socket')
const moment = require('moment')
const shortid = require('shortid')
const external_ip = promisify(require('external-ip')())
const createPeer = require('./peer')
const createMessageHandler = require('./message_handler')
const create_addresses = require('./addresses')

module.exports = ({ port, known, data_dir, test_id, test_mode }, { load, save, have }) => {
  return Promise.all([external_ip(), create_addresses({ data_dir, test_mode })])
    .then(([ip, addresses]) => {
      const my_id = test_id || shortid()
      const peers = []

      const data = {
        status: 'Disconnected',
        peers,
      }

      const broadcast = msg => {
        peers.map(p => p.send(msg))
      }

      const network = new EventEmitter()

      network.view = () => data
      network.broadcast = broadcast

      network.request = (hash) => {
        // TODO: limit peers?

        broadcast({
          type: 'request',
          hash
        })
      }

      const objects = {
        load, save, have
      }

      const server = net.createServer()

      const addPeer = peer => {
        peer.on('close', () => peers.splice(peers.indexOf(peer), 1))

        peers.push(peer)

        const handler = createMessageHandler({ objects, network, broadcast, addresses, my_id })

        peer.on('message', msg => handler(msg, peer))

        peer.send({ type: 'greet', ip, port: data.port, id: my_id })
      }

      const connect = (fullAddress) => {
        let [address, port] = fullAddress.split(':')

        if (peers.find(x => x.ip === address && x.port === port)) {
          return
        }

        opts.log.info('connect to ', fullAddress)
        const client = new net.Socket()
        const socket = new JsonSocket(client)

        socket.connect(port, address, () => {
          opts.log.info(`Network Joined ${fullAddress}`)

          data.status = 'Connected'
          addPeer(createPeer(socket, address, port))
        })

        client.on('error', err => opts.log.error(err))
      }

      server.on('connection', (connection) => {
        const socket = new JsonSocket(connection)

        data.status = 'Connected'

        const ip = connection.remoteAddress.split(':').pop()

        const peer = createPeer(socket, ip, connection.remotePort)
        addPeer(peer)
      })

      server.listen(port, function () {
        console.log(`Server Started On Port ${server.address().port}`)

        data.status = 'Started'
        data.port = server.address().port
      })

      if (known) {
        connect(known)

        const [ip, port] = known.split(':')
        addresses.add({ ip, port: Number(port) })
      }

      setInterval(() => {
        broadcast({ type: 'addr', addresses: addresses.get(5) })
      }, 3000)

      setInterval(() => {
        addresses.get(2)
          .filter(x => x)
          .map(({ip, port}) => connect(`${ip}:${port}`))
      }, 4000)

      return Promise.resolve(network)
    })
}