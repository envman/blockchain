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

      return true
    }
  }
}