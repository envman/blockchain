const createNetwork = require('./network')
const fork = require('child_process').fork
const createUser = require('./user')
const fs = require('fs-extra')
const path = require('path')
const h = require('./hash')
const shortid = require('shortid')
const action_handlers = require('./action_handlers')
const names = require('./names')
const createRandom = require('random-seed').create

const createWorld = _ => {
  const world = []

  for (let x = 0; x < 16; x++) {
    world[x] = []

    for (let y = 0; y < 16; y++) {
      world[x][y] = {
        style: 0,
        workers: [],
        characters: [],
      }
    }
  }

  return world
}

const createView = (existing, update) => {
  const view = existing || {
    users: {},
    world: createWorld(),
    done: [],
    turn: 0
  }

  if (update) {
    const random = createRandom(update.hash)
    const chance = percent => random(100) <= percent

    const first = view.turn === 0

    view.turn = view.turn + 1

    update.actions.map((a, i) => {
      view.done.push(a.hash)

      const handler = action_handlers[a.type]

      if (!handler) {
        throw new Error(`No Handler for ${JSON.stringify(a)}`)
        return console.error(`No Handler for ${a.type}`)
      }

      try {
        if (!handler.valid(a, view, i === 0)) {
          return
        }

        handler.update_view(a, view, i === 0)

        // console.log('update_view', view.users)
      } catch (error) {
        console.error('action', a)
        console.error('view', view)

        throw error
      }
    })

    // Game Start
    if (first) {
      const coin_base = update.actions[0]
      const first_player = coin_base.user

      const eden = view.world[0][0]

      eden.characters.push({
        name: 'Adam',
        sex: 'M',
        owner: first_player,
      })

      eden.characters.push({
        name: 'Eve',
        sex: 'F',
        owner: first_player,
      })
    }

    for (let column of view.world) {
      for (let tile of column) {
        const owners = new Set()

        tile.characters.map(x => owners.add(x.owner))

        for (let owner of owners) {
          const characters = tile.characters.filter(x => x.owner === owner).length

          if (characters > 1) {
            if (chance(10)) {
              const baby = {
                sex: chance(50) ? 'F' : 'M',
                owner,
              }

              baby.name = names[baby.sex][random(names[baby.sex].length)]

              tile.characters.push(baby)
            }
          }
        }
      }
    }
  }

  view.apply = block => createView(view, block)
  return view
}

const difficulty = 3

module.exports = (opts) => {
  const save_dir = opts.data_root || path.join(__dirname, '..', '..', 'data')
  const meta_path = path.join(save_dir, 'meta.json')

  if (opts.wipe) {
    fs.removeSync(save_dir)
  }

  fs.mkdirpSync(save_dir)

  let default_meta = {
    head: '0000000000000000000000000000000000000000000000000000000000000000'
  }

  const have = hash => fs.exists(path.join(save_dir, `${hash}.json`))

  const saveMeta = (meta) => {
    return fs.writeFile(path.join(save_dir, 'meta.json'), JSON.stringify(meta))
  }

  const loadMeta = () => {
    return fs.exists(meta_path)
      .then(exists => exists || fs.writeFile(meta_path, JSON.stringify(default_meta)))
      .then(_ => fs.readFile(meta_path, 'utf8'))
      .then(JSON.parse)
      .then(meta => {
        if (meta.head === default_meta.head) {
          return { meta }
        }

        return { meta }
      })
  }

  const load_meta = () => {
    if (!fs.existsSync(meta_path)) {
      fs.writeFileSync(meta_path, JSON.stringify(default_meta))
    }

    const meta = JSON.parse(fs.readFileSync(meta_path, 'utf8'))

    return { meta }
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

  const { meta } = load_meta()

  return Promise.all([createNetwork(opts, { load, save, have }), createUser(opts), loadMeta()])
    .then(([network, user]) => {
      const actions = []
      const pending_actions = []

      const waiting_load = []

      let view = createView()

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
          view = view.apply(current) || view
        }

        return view
      }

      const validateSignature = (msg) => {
        const signature = msg.signature
        const hash = msg.hash
        const user = msg.user

        return user.verify(hash, signature, user)
      }

      const createBlock = (view, msg, load, pending_actions) => new Promise((resolve, reject) => {
        // TODO: Timeout?

        const block = {
          ...msg.object,
          actions: msg.object.actions.slice()
        }

        if (msg.object.actions.length < 1) {
          return resolve(block)
        }

        msg.object.actions.map(a => {
          if (!a) {
            throw new Error(`Null action`)
          }

          load(a)
            .then(action => {
              const loaded = action => {
                block.actions.splice(block.actions.indexOf(a), 1, { ...action.object, hash: a, user: action.user })

                if (block.actions.every(x => x.type)) {
                  // const user_actions = block.actions.filter(x => x.type === 'register-user')
                  // TODO: Check all actions valid within game!

                  resolve(block)
                }
              }

              if (!action) {
                pending_actions.push({ hash: a, done: loaded })
                network.request(a)
              } else {
                loaded(action)
              }
            })
        })
      })

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

      const send = msg => network.broadcast(msg)

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
              type: 'transfer-money',
              to: user.public(),
              amount: 1,
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

      const update_view = (hash) => {
        return full_load(hash)
          .then(block => console.log('block') || block_to_view(block))
          .then(potential => {
            if (potential.turn <= view.turn) return

            view = potential
            meta.head = hash

            update_miner()
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
              const pends = waiting_load.filter(x => x.hash === msg.hash)
              pends.map(x => x.loaded(msg))

              const waiting = pending_actions.filter(a => a.hash === msg.hash)

              if (waiting.length > 0) {
                waiting.map(a => a.done(msg))
              }

              actions.push(msg.hash)
            })
        }

        if (msg.object.type === 'block') {
          save(msg.hash, msg)
            .then(_ => {
              const pends = waiting_load.filter(x => x.hash === msg.hash)
              pends.map(x => x.loaded(msg))

              if (pends.length > 0) return

              update_view(msg.hash)
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
            },

            game: view
          }
        },

        action: action => {
          action.stamp = shortid()
          // action.username = opts.username

          publish(action)
        },

        chain: _ => {
          const chain = []

          const loadBlock = hash => {
            // if (hash !== default_meta.head) {
            //   chain.push(hash)
            // }

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

        block: hash => {
          return load(hash)
            .then(block => {
              return createBlock(view, block, load, [])
            })
        },

        kill: () => {
          miner && miner.send({ type: 'kill' })
        }
      }
    })
}