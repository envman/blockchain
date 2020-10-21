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
const { getRandom } = require('./utils')

module.exports = ({ port, known, data_dir, test_id, test_mode, log }, { load, save, have }) => {
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

      network.view = () => ({
        status: data.status,
        peers: data.peers.filter(x => x.id)
      })
      
      network.broadcast = broadcast

      network.request = (hash) => {
        // TODO: limit peers?

        getRandom(peers, 2)
          .map(p => p.send({
            type: 'request',
            hash
          }))
        // broadcast({
        //   type: 'request',
        //   hash
        // })
      }

      const objects = {
        load, save, have
      }

      const server = net.createServer()

      const addPeer = peer => {
        peer.on('close', () => {
          log.info(`Close connection to ${peer.ip}:${peer.port}`)
          log.info(`Remove peer ${peers.length}`)
          peers.splice(peers.indexOf(peer), 1)
          log.info(`Removed peer ${peers.length}`)
        })

        peers.push(peer)

        const handler = createMessageHandler({ objects, network, broadcast, addresses, my_id, log, peers })

        peer.on('message', msg => handler(msg, peer))

        peer.send({ type: 'greet', ip, port: data.port, id: my_id })
      }

      const connect = (fullAddress) => {
        if (!fullAddress || fullAddress.trim().length === 0 || fullAddress.split(':').length < 2) {
          throw new Error(`Invalid address`)
        }

        let [address, port] = fullAddress.split(':')

        if (peers.find(x => x.ip === address && x.port === port)) {
          return
        }

        log.info(`connect to ${fullAddress}`)
        const client = new net.Socket()
        const socket = new JsonSocket(client)

        socket.connect(port, address, () => {
          log.info(`Network Joined ${fullAddress}`)

          data.status = 'Connected'
          addPeer(createPeer(socket, address, port))
        })

        client.on('error', err => log.error(err))
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

      const network_updates = () => {
        setTimeout(() => {
          broadcast({ type: 'addr', addresses: addresses.get(5) })

          log.info(`peers_all  ${peers.length}: ${data.peers.filter(x => x.id).length}`)

          if (peers.length < 5) {
            log.info('attempting new connections')

            addresses.get(5)
              .filter(x => x)
              .map(({ip, port}) => connect(`${ip}:${port}`))
          }

          network_updates()
        }, 500)
      }

      network_updates()

      return Promise.resolve(network)
    })
}