const fork = require('child_process').fork
const fs = require('fs-extra')
const path = require('path')
const shortid = require('shortid')

const h = require('./hash')
const createView = require('./view')
const createNetwork = require('./network')
const createUser = require('./user')
const wallet = require('./wallet')
const create_loader = require('./loader')
const action_handlers = require('./action_handlers')
const default_meta = require('./default_meta')

const difficulty = 3

module.exports = (opts) => {
  const save_dir = opts.data_root || path.join(__dirname, '..', '..', 'data')
  const meta_path = path.join(save_dir, 'meta.json')

  if (opts.wipe) {
    fs.removeSync(save_dir)
  }

  fs.mkdirpSync(save_dir)

  const have = hash => fs.exists(path.join(save_dir, `${hash}.json`))

  const save_meta = (meta) => {
    return fs.writeFile(path.join(save_dir, 'meta.json'), JSON.stringify(meta))
  }

  const load_meta = () => {
    return fs.exists(meta_path)
      .then(exists => exists || fs.writeFile(meta_path, JSON.stringify(default_meta)))
      .then(_ => fs.readFile(meta_path, 'utf8'))
      .then(JSON.parse)
  }

  const load = hash => {
    const dir = path.join(save_dir, `${hash}.json`)

    return fs.exists(dir)
      .then(exists => {
        if (!exists) {
          return
        }

        return fs.readFile(path.join(save_dir, `${hash}.json`), 'utf8')
          .then(JSON.parse)
      })
  }

  const save = (hash, object) => Promise.resolve(object)
    .then(x => JSON.stringify(x, null, 2))
    .then(x => fs.writeFile(path.join(save_dir, `${hash}.json`), x))

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
      view = view.apply(current) || view
    }

    return view
  }

  const create_update_view = full_load => {
    return (hash, view) => {
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
  }

  return Promise.all([createNetwork(opts, { load, save, have }), createUser(opts)])
    .then(([network, user]) => {
      const { full_load, network_loaded } = create_loader(network, load)
      const update_view = create_update_view(full_load)

      return load_meta()
        .then(meta => {
          if (meta.head === default_meta.head) {

          }

          return { meta }
        })
        .then(({ meta }) => {
          return { network, user, meta, full_load, network_loaded, update_view }
        })
    })
    .then(({ network, user, meta, full_load, network_loaded, update_view }) => {
      const actions = []
      let view = createView()

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
                      ...todo.map(a => a.hash)
                    ]
                  }
                })
              })
          })
      }

      if (opts.miner) {
        miner = fork('./block/miner')

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

                update_view(event.hash, view)
              })
          }
        })
      }

      network.on('first_load', (msg) => {
        const handler = action_handlers[msg.object.type]

        if (handler) {
          save(msg.hash, msg)
            .then(_ => {
              network_loaded(msg.hash)

              actions.push(msg.hash)
            })
        }

        if (msg.object.type === 'block') {
          save(msg.hash, msg)
            .then(_ => {
              const complete = network_loaded(msg.hash)

              if (complete) {
                update_view(msg.hash, view)
              }
            })
        }
      })

      return {
        view: () => {
          const network_view = network.view()
          const me = view.users[user.public()]

          return {
            network: {
              status: network_view.status,
              peers: network_view.peers.length,
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
    })
}