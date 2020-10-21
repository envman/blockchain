module.exports = (tasks, tasksets) => {
  return {
    tasks: {
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

      build: (building, building_location, free) => {
        return (current, view) => {
          const tile = view.world[building_location.x][building_location.y]
          tile.building = {
            type: building,
            created: view.turn
          }

          if (building === 'campfire') {
            tile.building.lit = true

            tile.building.tick = view => {
              const age = view.turn - tile.building.created

              if (tile.building.lit) {
                if (age % 5 === 0) {
                  tile.resources.sticks = tile.resources.sticks - 1
                }

                if (tile.resources.sticks < 1) {
                  tile.building.lit = false
                }
              }
            }
          }

          if (!free) {
            tile.resources.wood -= 5
          }

          return true
        }
      },
    },

    tasksets: {
      wait: () => {
        return {
          set: 'waiting',
          tasks: []
        }
      },

      gather: (pickup_tile, drop_tile, resource, carry_amount, out_resource) => {
        return {
          set: 'gathering resources',
          tasks: [
            tasks.move(pickup_tile),
            tasks.pickup(resource, carry_amount, out_resource),
            tasks.move(drop_tile),
            tasks.drop(resource, carry_amount)
          ]
        }
      },

      build: () => {

      }
    }
  }
}