const net = require('net')
const { promisify } = require('util')
const { EventEmitter } = require('events')
const JsonSocket = require('json-socket')
const external_ip = promisify(require('external-ip')())
const createPeer = require('./peer')
const createMessageHandler = require('./message_handler')
const create_addresses = require('./addresses')

module.exports = ({ port, known, data_dir }, { load, save, have }) => {
  return Promise.all([external_ip(), create_addresses({ data_dir })])
    .then(([ip, addresses]) => {
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

        const handler = createMessageHandler({ objects, network, broadcast, addresses })

        peer.on('message', msg => handler(msg, peer))

        peer.send({ type: 'greet', ip, port: data.port })
      }

      const connect = (fullAddress) => {
        console.log('connect to ', fullAddress)
        let [address, port] = fullAddress.split(':')

        const client = new net.Socket()
        const socket = new JsonSocket(client)

        socket.connect(port, address, () => {
          console.log(`Network Joined ${fullAddress}`)

          data.status = 'Connected'
          addPeer(createPeer(socket))
        })

        client.on('error', console.error)
      }

      server.on('connection', (connection) => {
        // console.log('connection', connection.remoteAddress, connection.remotePort)

        const socket = new JsonSocket(connection)

        data.status = 'Connected'

        const peer = createPeer(socket, connection.remoteAddress.split(':').pop())
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

      return Promise.resolve(network)
    })
}