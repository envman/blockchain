const names = require('./names')
const createRandom = require('random-seed').create
const action_handlers = require('./action_handlers')
const blank_hash = '0000000000000000000000000000000000000000000000000000000000000000'
const h = require('./hash')

const createWorld = _ => {
  const random = createRandom(blank_hash)
  const chance = percent => random(100) <= percent

  const world = []

  for (let x = 0; x < 32; x++) {
    world[x] = []

    for (let y = 0; y < 32; y++) {
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

  const pos_match = (a, b) => {
    return a.x === b.x && a.y === b.y
  }

  const find_path = (from, to) => {
    const nodes = []

    const create_path_node = (x, y, previous) => {
      if (!view.world[x] || !view.world[x][y]) {
        return
      }

      // if (view.world[x][y].resources.tree || view.world[x][y].resources.stone) {
      //   return
      // }

      if (nodes.find(n => n.x === x && n.y === y)) {
        return
      }

      const cost = previous && (previous.cost + 1) || 0
      const prediction = Math.abs(to.x - x) + Math.abs(to.y - y)
      const total = cost + prediction

      const node = { cost, total, prediction, x, y, previous }
      nodes.push(node)
    }

    const next = () => {
      nodes.sort((a, b) => b.total - a.total)
      const node = nodes[nodes.length - 1]

      if (node.prediction === 0) {
        return node
      }

      create_path_node(node.x, node.y + 1, node)
      create_path_node(node.x + 1, node.y, node)
      create_path_node(node.x, node.y - 1, node)
      create_path_node(node.x - 1, node.y, node)

      nodes.splice(nodes.indexOf(node), 1)
    }

    create_path_node(from.x, from.y)

    let cap = 0
    while (!next()) {
      if (cap > 1000) {
        throw new Error('Bad pathing')
      }

      cap = cap + 1
    }

    const finish = next()
    let current = finish
    const path = []

    while (current.previous) {
      path.unshift({ x: current.x, y: current.y })

      current = current.previous
    }

    return path
  }

  const tasks = {
    move: (pos) => {
      let path

      return (current, view, { hash }) => {
        if (!path) {
          path = find_path(current, pos)
        }

        const next = path.shift()
        const world = view.world

        world[current.x][current.y].assets = world[current.x][current.y].assets.filter(x => x !== hash)
        world[next.x][next.y].assets.push(hash)

        if (path.length === 0) {
          path = undefined

          return true
        }
      }
    },

    pickup: (input, count, output) => {
      output = output || input

      return (current, view, { state }) => {
        const { resources } = view.world[current.x][current.y]

        if (!resources[input]) return

        resources[input] -= count
        state.resources[output] = state.resources[output] || 0
        state.resources[output] += count

        return true
      }
    },

    drop: (input, count, output) => {
      output = output || input

      return (current, view, { state }) => {
        const { resources } = view.world[current.x][current.y]

        state.resources[output] -= count

        resources[input] = resources[input] || 0
        resources[input] += count

        return true
      }
    },

    build: (building, building_location) => {
      return (current, view) => {
        const tile = view.world[building_location.x][building_location.y]
        tile.building = building
        tile.resources.wood -= 5
        return true
      }
    }
  }

  const jobs = {
    chop: ({ to, pos }) => {
      return {
        set: 'gathering wood',
        tasks: [
          tasks.move(pos),
          tasks.pickup('tree', 1, 'wood'),
          tasks.move(to),
          tasks.drop('wood', 1)
        ]
      }
    },
    build: ({ building_location, resource_location, building }, view) => {

      const building_tile = view.world[building_location.x][building_location.y]

      if (building_tile.building) {
        return { complete: true }
      }

      if (building_tile.resources.wood >= 5) {
        return {
          set: 'building',
          tasks: [tasks.build(building, building_location)]
        }
      }

      return {
        set: 'gathering resources',
        tasks: [
          tasks.move(resource_location),
          tasks.pickup('wood', 1),
          tasks.move(building_location),
          tasks.drop('wood', 1)
        ]
      }
    }
  }

  const create_job = (goal, view) => {
    let current_index = -1
    let current_set = ''

    return () => {
      const tasks = jobs[goal.type](goal, view)

      if (tasks.complete) {
        return
      }

      if (tasks.set !== current_set) {
        current_index = -1
        current_set = tasks.set
      }

      current_index++

      if (current_index === tasks.tasks.length) {
        current_index = 0
      }

      return tasks.tasks[current_index]
    }
  }

  view.add_asset = obj => {
    const hash = h(obj)

    const state = {
      resources: {}
    }

    const asset = {
      asset: obj,
      state,
      hash,
      set_goal: goal => {
        delete state.job
        state.goal = goal
      }
    }

    asset.tick = () => {
      const pos = find(hash)

      if (state.goal && state.goal.type === 'move') {
        const { to } = asset.state.goal

        if (!state.path) {
          state.path = find_path(pos, to)
        }

        if (state.path) {
          state.step(pos)
        }
      }

      if (state.goal) {
        if (!state.job) {
          state.job = create_job(state.goal, view)
        }

        if (!state.task) {
          state.task = state.job()
          if (!state.task) {
            delete state.goal
            delete state.job
            return
          }
        }

        if (state.task(pos, view, asset)) {
          delete state.task
        }
      }
    }

    view.assets[hash] = asset

    return hash
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

      const eden = view.world[0][1]

      const adam = {
        type: 'character',
        name: 'Adam',
        sex: 'M',
        mum: blank_hash,
        dad: blank_hash,
      }

      const adam_hash = view.add_asset(adam)
      first_player.assets.push(adam_hash)
      eden.assets.push(adam_hash)

      const eve = {
        type: 'character',
        name: 'Eve',
        sex: 'F',
        mum: blank_hash,
        dad: blank_hash,
      }

      const eve_hash = view.add_asset(eve)
      first_player.assets.push(eve_hash)
      eden.assets.push(eve_hash)
    }

    for (let user_id of Object.keys(view.users)) {
      const user = view.users[user_id]
      const assets = user.assets
        .map(x => view.assets[x])

      const characters = assets
        .filter(x => x.asset.type === 'character')
        .map(x => {
          const hash = x.hash

          return {
            hash,
            location: find(hash),
            asset: x.asset,
          }
        })

      const women = characters.filter(x => x.asset.sex === 'F')
      const men = characters.filter(x => x.asset.sex === 'M')

      while (women.length > 0) {
        const current = women.pop()

        const partner = men.find(x => x.location.x === current.location.x && x.location.y === current.location.y)
        men.splice(men.indexOf(partner), 1)

        if (partner && chance(3)) {
          const baby = {
            type: 'character',
            sex: chance(50) ? 'F' : 'M',
            mum: current.hash,
            dad: partner.hash,
          }

          baby.name = names[baby.sex][random(names[baby.sex].length)]

          const baby_hash = h(baby)
          if (!view.assets[baby_hash]) { // No duplicate babys!
            view.add_asset(baby)
            user.assets.push(baby_hash)
            view.world[current.location.x][current.location.y].assets.push(baby_hash)
          }
        }
      }
    }
  }

  Object.values(view.assets).map(x => x.tick && x.tick())

  view.apply = block => createView(view, block)
  return view
}

module.exports = createView