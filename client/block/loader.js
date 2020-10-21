const default_meta = require('./default_meta')

module.exports = (network, load, log) => {

  let waiting_load = []

  const full_load = hash => {
    if (!hash) {
      throw new Error(`Loding null hash`)
    }

    return load(hash)
      .then(object => {
        return new Promise(resolve => {
          const awaiter = { hash }

          const loaded = obj => {
            log.info(`Loaded ${JSON.stringify(obj)}`)

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
                if (!obj.object.previous) {
                  log.error(`no previous ${JSON.stringify(obj)}`)
                  throw new Error(`no previous ${JSON.stringify(obj)}`)
                }

                const update_previous = full_load(obj.object.previous)
                  .then(p => {
                    obj.object.previous = p
                  })

                proms.push(update_previous)
              }

              return Promise.all(proms)
                .then(_ => {
                  resolve({ ...obj.object, user: obj.user })
                })
                .catch(err => {
                  log.error(`Error in Promise.all loader.js ${err}`)
                  throw err
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

  const network_loaded = msg => {
    const pends = waiting_load.filter(x => x.hash === msg.hash)
    pends.map(x => x.loaded(msg))

    if (pends.length > 0) {
      waiting_load = waiting_load.filter(x => x.hash !== msg.hash)
      return false
    }

    return true
  }

  return {
    full_load,
    network_loaded,
  }
}