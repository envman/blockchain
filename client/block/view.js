const names = require('./names')
const createRandom = require('random-seed').create
const action_handlers = require('./action_handlers')

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
      } catch (error) {
        console.error('action', a)
        console.error('view', view)

        throw error
      }
    })

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
            if (chance(4)) {
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

module.exports = createView