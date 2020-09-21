const names = require('./names')
const createRandom = require('random-seed').create
const action_handlers = require('./action_handlers')
const blank_hash = '0000000000000000000000000000000000000000000000000000000000000000'
const h = require('./hash')

const createWorld = _ => {
  const random = createRandom(blank_hash)
  const chance = percent => random(100) <= percent

  const world = []

  for (let x = 0; x < 16; x++) {
    world[x] = []

    for (let y = 0; y < 16; y++) {
      let resource

      if (chance(10)) {
        resource = 'tree'
      } else if (chance(10)) {
        resource = 'stone'
      }

      let amount
      if (resource) {
        amount = random(100)
      }

      world[x][y] = {
        style: 0,
        workers: [],
        assets: [],
        resources: {},
      }

      if (resource) {
        world[x][y].resources[resource] = amount
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
    turn: 0,
    trades: [],
    assets: {},
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
      } catch (error) {
        console.error('action', a)
        console.error('view', view)

        throw error
      }
    })

    if (first) {
      const coin_base = update.actions[0]
      const first_player = view.users[coin_base.user]

      const eden = view.world[0][0]

      const adam = {
        type: 'character',
        name: 'Adam',
        sex: 'M',
        mum: blank_hash,
        dad: blank_hash,
      }

      const adam_hash = h(adam)
      view.assets[adam_hash] = adam
      first_player.assets.push(adam_hash)
      eden.assets.push(adam_hash)

      const eve = {
        type: 'character',
        name: 'Eve',
        sex: 'F',
        mum: blank_hash,
        dad: blank_hash,
      }
      
      const eve_hash = h(eve)
      view.assets[eve_hash] = eve
      first_player.assets.push(eve_hash)
      eden.assets.push(eve_hash)
    }

    const find = hash => {
      for (let column of view.world) {
        const x = view.world.indexOf(column)

        for (let tile of column) {
          const y = column.indexOf(tile)

          if (tile.assets.includes(hash)) {
            return { x, y }
          }
        }
      }
    }

    for (let user_id of Object.keys(view.users)) {
      const user = view.users[user_id]
      const assets = user.assets
        .map(x => view.assets[x])

      const characters = assets
        .filter(x => x.type === 'character')
        .map(x => {
          const hash = h(x)

          return {
            hash,
            location: find(hash),
            asset: x,
          }
        })

      const women = characters.filter(x => x.asset.sex === 'F')
      const men = characters.filter(x => x.asset.sex === 'M')

      while (women.length > 0) {
        const current = women.pop()

        const partner = men.find(x => x.location.x === current.location.x && x.location.y === current.location.y)
        men.splice(men.indexOf(partner), 1)
        
        if (partner && chance(1)) {
          const baby = {
            type: 'character',
            sex: chance(50) ? 'F' : 'M',
            mum: current.hash,
            dad: partner.hash,
          }

          baby.name = names[baby.sex][random(names[baby.sex].length)]
    
          const baby_hash = h(baby)
          if (!view.assets[baby_hash]) { // No duplicate babys!
            view.assets[baby_hash] = baby
            user.assets.push(baby_hash)
            view.world[current.location.x][current.location.y].assets.push(baby_hash)
          }
        }
      }
    }
  }

  view.apply = block => createView(view, block)
  return view
}

module.exports = createView