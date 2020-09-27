const getUser = (users, key) => {
  if (!users[key]) {
    users[key] = {
      cash: 0,
      assets: [],
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

  'transaction': {
    update_view: ({ input, to, user }, view, coin_base) => {
      const to_user = getUser(view.users, to)

      if (coin_base) {
        to_user.cash = to_user.cash + Number(input.amount)
        return
      }

      const from_user = view.users[user]

      if (input.type === 'cash') {
        from_user.cash = from_user.cash - Number(input.amount)
        to_user.cash = to_user.cash + Number(input.amount)
      }

      if (input.type === 'asset') {
        from_user.assets = from_user.assets.filter(x => x !== input.hash)
        to_user.assets.push(input.hash)
      }
    },

    valid: ({ input, user }, view, coin_base) => {
      if (coin_base) {
        return input.type === 'cash' && input.amount === 1
      }

      const user_details = view.users[user]

      if (!user_details) {
        return false
      }

      if (input.type === 'cash') {
        if (user_details.cash < input.amount) return false
      }

      if (input.type === 'asset') {
        if (!user_details.assets.find(x => x === input.hash)) return false
      }

      return true
    }
  },

  'move': {
    update_view: ({ character, to }, view) => {
      const character_asset = view.assets[character]

      character_asset.set_goal({
        type: 'move',
        to
      })
    },

    valid: ({ character, user }, view) => {
      return view.users[user].assets.includes(character)
    }
  },

  'job': {
    update_view: ({ character, job, pos, to, work_location }, view) => {
      const character_asset = view.assets[character]

      character_asset.set_goal({
        type: job,
        pos,
        to,
        work_location,
      })
    },

    valid: ({ character, user }, view) => {
      return view.users[user].assets.includes(character)
    }
  },

  'build': {
    update_view: ({ building, character, resource_location, building_location }, view) => {
      const character_asset = view.assets[character]

      character_asset.set_goal({
        type: 'build',
        resource_location,
        building_location,
        building
      })
    },

    valid: ({ building, character, building_location, user }, view) => {
      const tile = view.world[building_location.x][building_location.y]

      if (!view.users[user].assets.includes(character)) {
        return false
      }

      if (tile.building) {
        return false
      }

      return true
    }
  }
}