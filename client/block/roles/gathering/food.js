const conditions = require('../conditions')

module.exports = (tasks, tasksets, buildings, jobs) => {
  return {
    tasks: {
      generate: (resource, amount) => {
        return (current, view, { state }) => {
          state.resources[resource] = state.resources[resource] || 0
          state.resources[resource] += amount

          return true
        }
      }
    },
    
  
    tasksets: {
      fish: (pickup_tile, drop_tile, resource, carry_amount) => {
        return {
          set: 'fishing',
          tasks: [
            tasks.move(pickup_tile),
            tasks.generate(resource, carry_amount),
            tasks.move(drop_tile),
            tasks.drop(resource, carry_amount)
          ]
        }
      },

      build: (building, resource_tile, building_tile) => {

        return {
          set: 'building',
          tasks: [

          ]
        }
      }
    },
  
    jobs: {
      can_build_food_box: (state, work_tile, home_tile, { find_tile }) => {
        const building_resources = find_tile(home_tile, 5, conditions.has_resources('wood', 5))
        const building_tile = find_tile(home_tile, 10, conditions.no_building())

        if (building_resources && building_tile) {
          return tasksets.build(buildings.food_box, building_resources, building_tile)
        }
      },

      gathering: (state, work_tile, home_tile, { find_tile }) => {
        const food_box = find_tile(home_tile, 10, conditions.has_building('food_box'))

        if (!food_box) {
          const building_resources = find_tile(home_tile, 5, conditions.has_resources('wood', 1))
          const building_tile = find_tile(home_tile, 10, conditions.no_building())

          if (building_tile.resources.wood && building_tile.resources.wood >= 5) {
            return tasksets.build(buildings.food_box, building_resources, building_tile)
          }

          if (building_resources && building_tile) {
            return tasksets.gather(building_resources, building_tile, 'wood', 1)
          }
        }

        const resource_tile = find_tile(work_tile, conditions.has_resources('berry', 1))
  
        if (!resource_tile) {
          return taskset.wait()
        }

        let drop_point = food_box || find_tile(home_tile, 5, conditions.tile_empty())

        if (!drop_point) {
          return taskset.wait()
        }

        return taskset.gather(resource_tile, drop_point, 'sticks', 1)
      },
  
      fishing: (state, work_tile, home_tile, { find_tile }) => {
        const food_box = find_tile(home_tile, 10, conditions.has_building('food_box'))

        if (!food_box) {
          const can_build = jobs.can_build_food_box(state, work_tile, home_tile, { find_tile })
          if (can_build) return can_build
        }

        let drop_point = food_box || find_tile(home_tile, 5, conditions.tile_empty())

        if (!drop_point) {
          return taskset.wait()
        }

        return taskSet.fish(resource_tile, drop_point, 'fish', 1)
      }
    },
  
    buildings: {
      food_box: () => {
        return {
          type: 'food_box',
          resources: {
            wood: 5
          }
        }
      }
    }
  }
}
