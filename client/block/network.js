const net = require('net')
const { EventEmitter } = require('events')
JsonSocket = require('json-socket')
const createPeer = require('./peer')
const createMessageHandler = require('./message_handler')

module.exports = ({ port, known }, { load, save, have }) => {
  const peers = []
  const addresses = []

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
  const rumors = new Set()

  const server = net.createServer()

  const addPeer = peer => {
    peer.on('close', () => peers.splice(peers.indexOf(peer), 1))

    peers.push(peer)

    // TODO: publish latest head
    // network.emit('gethead', head => {
    //   peer.send({
    //     type: 'publish',
    //     hash: head
    //   })
    // })

    const handler = createMessageHandler({ objects, network, broadcast, rumors, addresses })

    peer.on('message', msg => handler(msg, peer))
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

    peer.send({ type: 'greet', port: data.port })
  })

  server.listen(port, function () {
    console.log(`Server Started On Port ${server.address().port}`)

    data.status = 'Started'
    data.port = server.address().port
  })

  known && connect(known)

  return Promise.resolve(network)
}