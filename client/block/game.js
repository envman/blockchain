const createNetwork = require('./network')
const fork = require('child_process').fork
const createUser = require('./user')
const fs = require('fs-extra')
const path = require('path')
const h = require('./hash')
const shortid = require('shortid')
const action_handlers = require('./action_handlers')
const createView = require('./view')
const wallet = require('./wallet')
const create_loader = require('./loader')
const default_meta = require('./default_meta')
const { EventEmitter } = require('events')

module.exports = (opts) => {
  let difficulty = 2

  if (opts.test_mode) {
    difficulty = 0
  }

  const save_dir = opts.data_root || path.join(__dirname, '..', '..', 'data')
  const objects_dir = path.join(save_dir, 'objects')
  const meta_path = path.join(save_dir, 'meta.json')

  if (opts.wipe) {
    fs.removeSync(objects_dir)
  }

  fs.mkdirpSync(objects_dir)

  opts.data_dir = save_dir

  const object_cache = {}

  const have = hash => {
    if (object_cache[hash]) {
      return Promise.resolve(true)
    }

    return fs.exists(path.join(save_dir, `${hash}.json`))
  }

  const save_meta = (meta) => {
    return fs.writeFile(path.join(save_dir, 'meta.json'), JSON.stringify(meta))
  }

  const load_meta = () => {
    return fs.exists(meta_path)
      .then(exists => exists || fs.writeFile(meta_path, JSON.stringify(default_meta)))
      .then(_ => fs.readFile(meta_path, 'utf8'))
      .then(JSON.parse)
      .catch(err => {
        opts.log.error(`Error loading meta ${err}`)
        throw err
      })
  }

  const load = hash => {
    opts.log.info(`Load ${hash}`)

    if (object_cache[hash]) {
      return Promise.resolve(JSON.parse(JSON.stringify(object_cache[hash])))
    }

    const dir = path.join(objects_dir, `${hash}.json`)

    return fs.exists(dir)
      .then(exists => {
        if (!exists) {
          return
        }

        return fs.readFile(path.join(objects_dir, `${hash}.json`), 'utf8')
          .then(x => {
            try {
              return JSON.parse(x)
            } catch (error) {
              opts.log.error(`Cannot parse ${x}`)
              throw error
            }
          })
          .catch(err => {
            opts.log.error(`Error loading ${hash} ${err}`)
            throw err
          })
      })
  }

  const save = (hash, object) => {
    opts.log.info(`Save ${hash} ${JSON.stringify(object)}`)

    object_cache[hash] = JSON.parse(JSON.stringify(object))

    if (opts.test_mode) {
      return Promise.resolve()
    }

    return Promise.resolve(object)
      .then(x => JSON.stringify(x, null, 2))
      .then(x => fs.writeFile(path.join(objects_dir, `${hash}.json`), x))
  }

  return Promise.all([createNetwork(opts, { load, save, have }), createUser(opts), load_meta()])
    .then(([network, user, meta]) => {
      const actions = []
      let view = createView()

      const { full_load, network_loaded } = create_loader(network, load, opts.log)

      // Block is the latest
      const block_to_view = block => {
        const chain = []
        chain.unshift(block)

        let previous = block.previous
        while (previous) {
          chain.unshift(previous)

          previous = previous.previous
        }

        let view = createView()

        for (let current of chain) {
          if (current !== default_meta.head) {
            view = view.apply(current) || view
          }
        }

        return view
      }

      const objectMessage = (msg) => {
        const hash = h(msg)
        const signature = user.sign(hash).toString('hex')

        return {
          object: msg,
          hash,
          signature,
          user: user.public(),
        }
      }

      const publish = (msg) => {
        const message = objectMessage(msg)

        save(message.hash, message)
        actions.push(message.hash)

        network.broadcast({
          type: 'publish',
          hash: message.hash
        })
      }

      let miner

      const update_miner = () => {
        if (!miner) return

        const proms = actions
          .filter(a => !view.done.includes(a))
          .map(a => load(a).then(x => {
            if (!x) console.error(`cannot load ${a}`)

            return x
          }))

        Promise.all(proms)
          .then(todo => {
            todo = todo.filter(a => {
              const handler = action_handlers[a.object.type]

              if (!handler) return false

              try {
                return handler.valid({ ...a.object, user: a.user }, view)
              } catch (error) {
                console.error('action', a)
                console.error('view', view)

                throw error
              }
            })

            const coin_base = objectMessage({
              type: 'transaction',
              to: user.public(),
              input: {
                type: 'cash',
                amount: 1,
              },
              stamp: shortid(),
            })

            save(coin_base.hash, coin_base)
              .then(_ => {
                miner.send({
                  type: 'block',
                  body: {
                    type: 'block',
                    previous: meta.head,
                    difficulty: difficulty,
                    nonce: 0,
                    actions: [
                      coin_base.hash,
                      ...todo.map(a => a.hash).filter((x, i, a) => a.indexOf(x) === i)
                    ]
                  }
                })
              })
          })
          .catch(err => opts.log.error(`Miner promise all ${err}`))
      }

      const update_view = (hash) => {
        return full_load(hash)
          .then(block => block_to_view(block))
          .then(potential => {
            if (potential.turn <= view.turn) return

            view = potential
            meta.head = hash

            save_meta(meta)
              .then(_ => {
                update_miner()
              })
          })
      }

      if (opts.miner) {
        if (opts.test_mode) {
          miner = new EventEmitter()

          let timeout

          miner.send = obj => {
            if (timeout) {
              console.log('clear timeout')
              clearTimeout(timeout)
            }

            if (obj.type === 'block') {
              console.log('queue block')

              setTimeout(() => {
                miner.emit('message', {
                  type: 'block',
                  hash: h(obj.body),
                  block: obj.body,
                })
              }, Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000)
            }
          }          
        } else {
          miner = fork('./block/miner')
        }

        if (meta.head === default_meta.head) {
          update_miner()
        }

        miner.on('message', event => {
          if (event.type === 'block') {
            console.log(`MINED: ${event.hash} ${JSON.stringify(event.block)}`)

            const object = objectMessage(event.block)

            save(event.hash, object)
              .then(_ => {
                network.broadcast({
                  type: 'publish',
                  hash: event.hash
                })

                update_view(event.hash)
              })
          }
        })
      }

      network.on('first_load', (msg) => {
        const handler = action_handlers[msg.object.type]

        if (handler) {
          save(msg.hash, msg)
            .then(_ => {
              network_loaded(msg)

              actions.push(msg.hash)
            })
        }

        if (msg.object.type === 'block') {
          opts.log.info(`GOT BLOCK ${JSON.stringify(msg)}`)

          save(msg.hash, msg)
            .then(_ => {
              const complete = network_loaded(msg)

              if (complete) {
                update_view(msg.hash)

                network.broadcast({
                  type: 'publish',
                  hash: msg.hash
                })
              }
            })
        }
      })

      if (meta.head !== default_meta.head) {
        update_view(meta.head)
      }

      return {
        view: () => {
          const network_view = network.view()
          const me = view.users[user.public()]

          return {
            network: {
              status: network_view.status,
              peers: network_view.peers,
              port: network_view.port,
            },

            chain: {
              head: meta.head,
            },

            user: {
              username: opts.username,
              workers: me && me.workers,
              cash: me && me.cash,
              members: me && me.members,
              key: user.public(),
              assets: me && me.assets,
            },

            game: view
          }
        },

        action: action => {
          action.stamp = shortid()

          publish(action)
        },

        contract: ({ amount, type }) => {
          wallet.generate_address()
            .then(address => {
              const contract = {
                type,
                amount,
                asset,
                contract_address: address.public,
                stamp: shortid(),
              }

              publish(contract)
            })
        },

        chain: _ => {
          const chain = []

          const loadBlock = hash => {
            return load(hash)
              .then(block => {
                if (block) {
                  chain.push(block)

                  const previous = block.object.previous

                  return loadBlock(previous)
                }
              })
          }

          return loadBlock(meta.head)
            .then(_ => chain)
        },

        // block: hash => {
        //   return load(hash)
        //     .then(block => {
        //       // return createBlock(view, block, load, [])
        //     })
        // },

        kill: () => {
          miner && miner.send({ type: 'kill' })
        }
      }
    }).catch(err => opts.log.error(err))
}