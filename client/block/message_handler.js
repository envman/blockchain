const h = require('./hash')

module.exports = ({ objects, network, broadcast, rumors, addresses }) => {
  const network_messages = {
    greet: (msg, peer) => {
      const existing = addresses.find(x => x.port === msg.port)
    },

    publish: (msg, peer) => {
      objects.load(msg.hash)
        .then(existing => {
          if (!existing) {
            rumors.add(msg.hash)

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
              username: object.username,
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
            console.error(`Hash Mismatch h:${hash} msg:${msg.hash}`)
            return
          }

          network.emit('first_load', msg)
        })
    },
  }

  return (msg, peer) => {
    console.log(`NET GET: ${msg.type} ${JSON.stringify(msg).slice(0, 100)}`)

    const handler = network_messages[msg.type]

    if (!handler) {
      throw new Error(`No handler for ${JSON.stringify(msg)}`)
      return console.error(`No handler for ${msg.type}`)
    }

    return handler(msg, peer)
  }
}