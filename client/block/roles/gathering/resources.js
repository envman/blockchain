const conditions = require('../conditions')

module.exports = (tasks, tasksets, buildings, jobs) => {
  return {
    tasks: {
    },
    
  
    tasksets: {
    },
  
    jobs: {
      tree_chopper: (state, work_tile, home_tile, { find_tile }) => {      
        const tree_tile = find_tile(work_tile, 10, conditions.has_resources('tree', 1))

        if (!tree_tile) {
          return tasksets.wait()
        }

        let drop_point = find_tile(home_tile, 5, conditions.tile_empty())

        if (!drop_point) {
          return taskset.wait()
        }

        return taskset.gather(tree_tile, drop_point, 'tree', 1, 'wood')
      },
    },
  
    buildings: {
    }
  }
}
