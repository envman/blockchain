module.exports = {
  'register-user': {
    update_view: (a, view) => {
      view.users.push({
        username: a.username,
        key: a.key,
        workers: 3,
        cash: 0,
        members: 0,
      })
    },

    valid: (a, view) => {
      if (view.users.find(x => a.username === x.username)) {
        return false
      }

      return true
    }
  },

  'deploy-worker': {
    update_view: ({ pos, username }, view) => {
      const user = view.users.find(x => x.username === username)
      user.workers = user.workers - 1

      const worker = {
        username: user.username,
        tile: () => view.world[pos.x][pos.y]
      }

      worker.tick = () => {
        const { tile } = worker

        if (tile().building) {
          tile().building.tick()
        } else {
          user.cash = user.cash + 1
        }
      }

      view.world[pos.x][pos.y].workers.push(worker)
    },

    valid: ({ pos, username }, view) => {
      const user = view.users.find(x => x.username === username)
      if (user.workers < 1) {
        return false
      }
      
      const tile = view.world[pos.x][pos.y]

      const cap = (tile.building && tile.building.level) || 1
      return tile.workers.length < cap
    }
  },

  'purchase-land': {
    update_view: ({ pos, username }, view) => {
      view.world[pos.x][pos.y].owner = username
      const user = view.users.find(x => x.username === username)
      user.cash = user.cash - 4
    },

    valid: (a, view) => {
      const user = view.users.find(x => x.username === a.username)

      if (user.cash < 4) {
        return false
      }

      return !view.world[a.pos.x][a.pos.y].owner
    }
  },

  'build-factory': {
    update_view: ({ pos, username }, view) => {
      const user = view.users.find(x => x.username === username)
      user.cash = user.cash - 8

      const tile = view.world[pos.x][pos.y]

      tile.building = {
        code: 'F',
        level: 1,
        name: 'Factory'
      }

      tile.building.tick = () => {
        user.cash = user.cash + (tile.building.level * 2)
      }
    },

    valid: (a, view) => {
      const user = view.users.find(x => x.username === a.username)

      if (user.cash < 8) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]

      return tile.owner == user.username && !tile.building
    }
  },

  'move-worker': {
    update_view: ({ pos, from, username }, view) => {
      const origin = view.world[from.x][from.y]

      const worker = origin.workers.find(x => x.username === username)
      origin.workers.splice(origin.workers.indexOf(worker), 1)

      const destination = view.world[pos.x][pos.y]
      worker.tile = () => destination
      destination.workers.push(worker)
    },

    valid: ({ from, username }, view) => {
      const origin = view.world[from.x][from.y]
      const worker = origin.workers.find(x => x.username === username)

      return !!worker
    }
  },

  'build-recruiter': {
    update_view: ({ pos, username }, view) => {
      const user = view.users.find(x => x.username === username)
      user.cash = user.cash - 20

      const tile = view.world[pos.x][pos.y]

      tile.building = {
        code: 'R',
        level: 1,
        name: 'Recruiter',
        built: view.turn,
      }

      tile.building.tick = () => {
        const age = view.turn - tile.building.built

        if (age % 10 === 0) {
          user.workers = user.workers + tile.building.level
        }
      }
    },

    valid: (a, view) => {
      const user = view.users.find(x => x.username === a.username)

      if (user.cash < 20) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]

      return tile.owner == user.username && !tile.building
    }
  },

  'upgrade-building': {
    update_view: ({ pos, username }, view) => {
      const building = view.world[pos.x][pos.y].building
      building.level = building.level + 1
      const user = view.users.find(x => x.username === username)
      user.cash = user.cash - 20
    },

    valid: (a, view) => {
      const user = view.users.find(x => x.username === a.username)

      if (user.cash < 20) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]

      return tile.owner == user.username && tile.building
    }
  },

  'build-hq': {
    update_view: ({ pos, username }, view) => {
      const user = view.users.find(x => x.username === username)
      user.cash = user.cash - 40

      const tile = view.world[pos.x][pos.y]

      tile.building = {
        code: 'H',
        level: 1,
        name: 'HQ',
        built: view.turn,
      }

      tile.building.tick = () => {
        const age = view.turn - tile.building.built

        if (age % 20 === 0) {
          user.members = user.members + tile.building.level
        }
      }
    },

    valid: (a, view) => {
      const user = view.users.find(x => x.username === a.username)

      if (user.cash < 40) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]

      return tile.owner == user.username && !tile.building
    }
  },
}