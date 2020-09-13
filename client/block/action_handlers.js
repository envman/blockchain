module.exports = {
  'register-user': {
    update_view: (a, view) => {
      view.users.push({
        username: a.username,
        key: a.key,
        workers: 3,
        cash: 0,
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

      view.world[pos.x][pos.y].workers.push({ username: user.username })
    },

    valid: (a, view) => {
      const user = view.users.find(x => x.username === a.username)
      return user.workers > 0
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
      view.world[pos.x][pos.y].building = 'F'
      const user = view.users.find(x => x.username === username)
      user.cash = user.cash - 8
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
      view.world[pos.x][pos.y].building = 'R'
      const user = view.users.find(x => x.username === username)
      user.cash = user.cash - 20
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
}