const getUser = (users, key) => {
  if (!users[key]) {
    users[key] = {
      cash: 0,
    }
  }

  return users[key]
}

module.exports = {
  'purchase-land': {
    update_view: ({ pos, user }, view) => {
      view.world[pos.x][pos.y].owner = user
      const user_details = view.users[user]
      user_details.cash = user_details.cash - 4
    },

    valid: (a, view) => {
      const user_details = view.users[a.user]

      if (!user_details) return false

      if (user_details.cash < 4) {
        return false
      }

      return !view.world[a.pos.x][a.pos.y].owner
    }
  },

  'build-factory': {
    update_view: ({ pos, user }, view) => {
      console.log('build-factory')

      const user_details = view.users[user]
      user_details.cash = user_details.cash - 8

      const tile = view.world[pos.x][pos.y]

      tile.building = {
        code: 'F',
        level: 1,
        name: 'Factory'
      }

      tile.building.tick = () => {
        user_details.cash = user_details.cash + (tile.building.level * 2)
      }
    },

    valid: (a, view) => {
      const user_details = view.users[a.user]
      
      if (!user_details) {
        return false
      }

      if (user_details.cash < 8) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]
      return tile.owner === a.user && !tile.building
    }
  },

  'build-recruiter': {
    update_view: ({ pos, user }, view) => {
      const user_details = getUser(user)
      user_details.cash = user_details.cash - 20

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
          user_details.workers = user_details.workers + tile.building.level
        }
      }
    },

    valid: (a, view) => {
      const user_details = getUser(user)

      if (user_details.cash < 20) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]

      return tile.owner == user && !tile.building
    }
  },

  'upgrade-building': {
    update_view: ({ pos, user }, view) => {
      const building = view.world[pos.x][pos.y].building
      building.level = building.level + 1
      const user_details = getUser(user)
      user_details.cash = user_details.cash - 20
    },

    valid: (a, view) => {
      const user_details = getUser(user)

      if (user_details.cash < 20) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]

      return tile.owner == user && tile.building
    }
  },

  'build-hq': {
    update_view: ({ pos, user }, view) => {
      const user_details = getUser(user)
      user_details.cash = user_details.cash - 40

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
          user_details.members = user_details.members + tile.building.level
        }
      }
    },

    valid: (a, view) => {
      const user_details = getUser(user)

      if (user_details.cash < 40) {
        return false
      }

      const tile = view.world[a.pos.x][a.pos.y]

      return tile.owner == user && !tile.building
    }
  },

  'transfer-money': {
    update_view: ({ amount, to, user }, view, coin_base) => {
      if (!coin_base) {
        const from_user = view.users[user]
        from_user.cash = from_user.cash - amount
      }
      
      const to_user = getUser(view.users, to)
      to_user.cash = to_user.cash + amount
    },

    valid: ({ amount, user }, view, coin_base) => {
      if (coin_base) {
        return amount === 1
      }

      const user_details = view.users[user]

      if (!user_details) {
        return false
      }

      if (user_details.cash < amount) {
        return false
      }

      return true
    }
  }
}