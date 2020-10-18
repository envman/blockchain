const h = require('./hash')
const validate_signature = require('./validate_signature')

module.exports = ({ objects, network, broadcast, addresses, my_id }) => {
  const network_messages = {
    greet: ({ port, ip, id }, peer) => {
      if (id === my_id) {
        peer.emit('close')
        return
      }

      addresses.add({ port, ip })

      peer.id = id
    },

    addr: (msg) => {
      addresses.add(...msg.addresses)
    },

    publish: (msg, peer) => {
      objects.load(msg.hash)
        .then(existing => {
          if (!existing) {
            peer.send({
              type: 'request',
              hash: msg.hash
            })
          }
        })
    },

    request: (msg, peer) => {
      objects.load(msg.hash)
        .then(object => {
          if (object) {
            peer.send({
              type: 'content',
              hash: msg.hash,
              object: object.object,
              signature: object.signature,
              user: object.user,
            })
          }
        })
    },

    content: (msg, peer) => {
      objects.have(msg.hash)
        .then(have => {
          if (have) return

          const hash = h(msg.object)

          if (hash !== msg.hash) {
            return console.error(`Hash Mismatch h:${hash} msg:${msg.hash}`)
          }

          try {
            if (!validate_signature(msg.hash, msg.signature, msg.user)) {
              return console.error(`Invalid signature`)
            }
          } catch (error) {
            console.error('Error validating signature')
            console.error(JSON.stringify(msg, null, 2))

            throw error
          }

          network.emit('first_load', msg)
        })
    },
  }

  return (msg, peer) => {
    // console.log(`NET GET: ${msg.type} ${JSON.stringify(msg).slice(0, 100)}`)

    if (msg.success === false) {
      console.log('Failed connection?')
      peer.emit('close')

      return
    }

    const handler = network_messages[msg.type]

    if (!handler) {
      // throw new Error(`No handler for ${JSON.stringify(msg)}`)
      return console.error(`No handler for ${msg.type}`)
    }

    return handler(msg, peer)
  }
}