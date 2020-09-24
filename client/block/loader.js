const default_meta = require('./default_meta')

module.exports = (network, load) => {

  const waiting_load = []

  const full_load = hash => {
    return load(hash)
      .then(object => {
        return new Promise(resolve => {
          const awaiter = { hash }

          const loaded = obj => {
            waiting_load.splice(waiting_load.indexOf(awaiter, 1))

            if (!obj.object) {
              throw new Error(`Invalid Object`)
            }

            obj.object.hash = obj.hash

            if (obj.object.type === 'block') {
              const proms = obj.object.actions.map(a => {
                return full_load(a)
                  .then(action => obj.object.actions.splice(obj.object.actions.indexOf(a), 1, action))
              })

              if (obj.object.previous !== default_meta.head) {
                const update_previous = full_load(obj.object.previous)
                  .then(p => {
                    obj.object.previous = p
                  })

                proms.push(update_previous)
              } else {
                delete obj.object.previous
              }

              return Promise.all(proms)
                .then(_ => {
                  resolve({ ...obj.object, user: obj.user })
                })
            }

            return resolve({ ...obj.object, user: obj.user })
          }

          awaiter.loaded = loaded

          waiting_load.push(awaiter)

          if (!object) {
            network.request(hash)
          } else {
            loaded(object)
          }
        })
      })
  }

  const network_loaded = hash => {
    const pends = waiting_load.filter(x => x.hash === hash)
    pends.map(x => x.loaded(msg))

    if (pends.length > 0) {
      waiting_load = waiting_load.filter(x => x.hash !== hash)
      return false
    }

    return true
  }

  return {
    full_load,
    network_loaded,
  }
}