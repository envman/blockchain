module.exports = {
  tile_empty = () =>  t => Object.values(t.resources).reduce((a, b) => a + b) === 0,

  no_building = () => t => !t.building,

  has_building = building => t => t.building && t.building.type === building,

  has_resources =  (resource_type, amount) => t => t.resources[resource_type] >= amount,
}