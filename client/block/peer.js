const EventEmitter = require('events')
const h = require('./hash')
const vaidate_signature = require('./validate_signature')

const alive_time = 60000 * 2

module.exports = (connection, host) => {
  const peer = new EventEmitter()

  // console.log('add', host)

  // peer.host = connection.fulladdress

  connection.on('error', () => {
    peer.emit('close')
  })

  let timer
  let final

  const reset_dead = () => {
    clearTimeout(timer)
    clearTimeout(final)

    timer = setTimeout(() => {
      peer.send({ type: 'ping' })

      final = setTimeout(() => {
        peer.emit('close')
      }, alive_time)
    }, alive_time)
  }

  connection.on('message', message => {
    reset_dead()

    if (message.type === 'ping') {
      return peer.send({ type: 'pong' })
    }

    if (message.type === 'pong') {
      return
    }

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
  }

  reset_dead()

  return peer
}