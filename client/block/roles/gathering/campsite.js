const conditions = require('../conditions')

module.exports = (tasks, tasksets, buildings, jobs) => {
  return {
    tasks: {
    },
    
  
    tasksets: {
    },
  
    jobs: {
      builder: (home_tile, work_tile, find_tile) => {
        const campfire = find_tile(work_tile, 10, conditions.has_building('campfire'))

        if (!campfire) {
          const building_resources = find_tile(home_tile, 50, conditions.has_resources('wood', 5))
  
          if (building_resources) {
            return tasksets.build(buildings.campfire, building_resources, work_tile)
          } else {
            return tasksets.wait()
          }
        }

        const tent = find_tile(work_tile, 10, conditions.has_building('tent'))

        if (!tent) {
          const building_resources = find_tile(home_tile, 50, conditions.has_resources('wood', 1))
        }

        // TODO: keep fire lit
        // TODO: build tent

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
    },
  
    buildings: {
      campfire: () => {
        return {
          type: 'food_box',
          resources: {
            wood: 5
          }
        }
      },

      tent: () => {
        return {
          type: 'tent',
          resources: {
            wood: 5
          }
        }
      }
    }
  }
}
