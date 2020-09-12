const EventEmitter = require('events')

module.exports = (connection) => {
  const peer = new EventEmitter()

  // connection.once('close', () => {
  //   peer.emit('close')
  // })

  connection.on('error', () => {
    peer.emit('close')
  })

  connection.on('message', message => {
    peer.emit('message', message)
  })

  peer.send = msg => {
    if (msg.type === 'request' && !msg.hash) {
      throw new Error(`Cannot request null hash`)
    }

    console.log(`NET SEND: ${JSON.stringify(msg).slice(0, 100)}`)

    if (!msg.type) {
      throw new Error(`No message type`)
    }

    connection.sendMessage(msg)

    // connection.write(JSON.stringify(msg) + '__')
  }

  return peer
}