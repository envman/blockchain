const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

const colors = {
  0: '#FFFFFF',
  1: '#000000',
  2: '#575757',
  3: '#A0A0A0',
  4: '#2A4BD7',
  5: '#1D6914',
  6: '#814A19',
  7: '#8126C0',
  8: '#9DAFFF',
  9: '#81C57A',
  10: '#E9DEBB',
  11: '#AD2323',
  12: '#29D0D0',
  13: '#FFEE33',
  14: '#FF9233',
  15: '#FFCDF3',
}

const load_image = image => {
  return new Promise((resolve, _) => {
    const img = new Image()
    img.src = image
    img.onload = _ => resolve(img)
  })
}

const images = [
  'tree',
  'carrot',
  'field_planted',
  'field_growing',
  'field',
  'farm',
  'tent',
  'log',
  'logs',
  'character',
  'stone',
  'grass',
  'campfire',
  'campfire_lit',
  'campfire_out',
  'sticks',
]

const load_images = () => {
  const output = {}

  return Promise.all(images
    .map(i => load_image(`/img/${i}.png`).then(image => output[i] = image)))
    .then(_ => output)
}

const window_size = {
  height: 800,
  width: 800
}

const height = 32
const width = 32

const square = {
  width: window_size.width / width,
  height: window_size.height / height,
}

const draw = ({ game, user }, images) => {
  for (let column of game.world) {
    const x = game.world.indexOf(column)

    for (let tile of column) {
      const y = column.indexOf(tile)

      ctx.fillStyle = "#000000"
      if (selected_tile) {
        if (selected_tile.x === x && selected_tile.y === y) {
          ctx.fillStyle = colors[9]
        }
      }

      ctx.fillRect(x * square.height, y * square.width, square.height, square.width)

      ctx.fillStyle = 'green'

      ctx.drawImage(images.grass, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)

      ctx.font = '14px serif';
      ctx.fillStyle = "#000000"

      ctx.fillText(`${tile.assets.length}`, (x * square.width) + 2, (y * square.height) + 45)

      if (tile.building && tile.building.type === 'tent') {
        ctx.drawImage(images.tent, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.building && tile.building.type === 'farm') {
        ctx.drawImage(images.farm, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.building && tile.building.type === 'field') {
        if (tile.planted === 1) {
          ctx.drawImage(images.field_planted, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
        } else if (tile.planted === 2) {
          ctx.drawImage(images.field_growing, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
        } else {
          ctx.drawImage(images.field, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
        }
      }

      if (tile.building && tile.building.type === 'campfire') {
        if (tile.building.lit) {
          ctx.drawImage(images.campfire_lit, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
        } else if (tile.building.out) {
          ctx.drawImage(images.campfire_out, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
        } else {
          ctx.drawImage(images.campfire, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
        }
      }

      if (tile.resources.tree) {
        ctx.drawImage(images.tree, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      } else if (!tile.building && tile.resources.sticks) {
        ctx.drawImage(images.sticks, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.resources.stone) {
        ctx.drawImage(images.stone, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.resources.carrots && tile.building && tile.building.type !== 'farm') {
        ctx.drawImage(images.carrot, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.resources.wood) {
        const image = tile.resources.wood > 1 ? images.logs : images.log

        ctx.drawImage(image, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.assets.length > 0) {
        ctx.drawImage(images.character, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }
    }
  }
}

let mode
let mode_data
let selected_tile
let selected_character
let selector

const publish_action = action => {
  console.log('action', action)

  return fetch(`${window.location.origin}/action`, {
    method: 'POST',
    headers: {
      "Content-Type": 'application/json'
    },
    body: JSON.stringify(action)
  }).then(() => {
    mode = undefined
    mode_data = undefined
  })
}

const selectPosition = (name, done) => {
  return {
    name,
    activate: (completed) => {
      console.log(`${name} activated`)

      selector = (...p) => {
        console.log(`${name} selected ${JSON.stringify(p)}`)

        done(...p)
        completed()
      }
    },
  }
}

canvas.addEventListener('click', e => {
  const x = e.offsetX
  const y = e.offsetY

  const pos = {
    x: Math.floor(x / square.width),
    y: Math.floor(y / square.height),
  }

  if (selector) {
    selector(pos)
  } else {
    selected_tile = pos
  }
})

const publish = action => {
  return {
    activate: (completed) => {
      publish_action(action)
        .then(_ => completed())
    }
  }
}

let current_steps = []
let current_action

const action_builder = (steps) => {
  current_steps = steps

  let current

  current_action = () => {
    if (!current) {
      current = current_steps[0]

      if (!current) return

      current.activate(() => {
        current = undefined
        current_steps.shift()
        selector = undefined
        selected_character = undefined
      })
    }

    return current
  }
}

$(() => {
  load_images()
    .then(images => {
      const update = () => {
        fetch(`${window.location.origin}/view`, {})
          .then(res => res.json())
          .then(x => {
            draw(x, images)
            $('.user').text(`User: ${x.user.username}`)
            $('.turn').text(`Turn: ${x.game.turn}`)
            $('.cash').html(x.user.cash)

            $('.action-builder').empty()

            const action = current_action && current_action()
            if (action) {
              $('.action-builder').append(`<h3>${action.name}<h3>`)
            }

            const characters = x.user.assets.map(a => ({ hash: a, character: x.game.assets[a].asset, state: x.game.assets[a].state }))

            $('.characters').empty()
            if (selected_character) {
              const state = selected_character.state.current || 'idle'
              $('.characters').append(`<h2>${selected_character.character.name} - ${state}</h2>`)

              const button = (name, click) => {
                const button = $(`<button>${name}</button>`)
                button.click(click)
                $('.characters').append(button)
              }

              button('move', _ => {
                const action = {
                  type: 'move',
                  character: selected_character.hash
                }

                action_builder([
                  selectPosition('Select target location', x => action.to = x),
                  publish(action)
                ])
              })

              button('chop', _ => {
                const action = {
                  type: 'job',
                  job: 'chop',
                  character: selected_character.hash
                }

                action_builder([
                  selectPosition('Select resource location', x => action.pos = x),
                  selectPosition('Select target location', x => action.to = x),
                  publish(action)
                ])
              })

              button('work', _ => {
                const action = {
                  type: 'job',
                  job: 'work',
                  character: selected_character.hash
                }

                action_builder([
                  selectPosition('Select work location', x => action.work_location = x),
                  publish(action)
                ])
              })

              button('build-tent', _ => {
                const action = {
                  type: 'build',
                  building: 'tent',
                  character: selected_character.hash
                }

                action_builder([
                  selectPosition('Select resource location', x => action.resource_location = x),
                  selectPosition('Select building location', x => action.building_location = x),
                  publish(action)
                ])
              })

              button('build-farm', _ => {
                const action = {
                  type: 'build',
                  building: 'farm',
                  character: selected_character.hash
                }

                action_builder([
                  selectPosition('Select resource location', x => action.resource_location = x),
                  selectPosition('Select building location', x => action.building_location = x),
                  publish(action)
                ])
              })
            } else {
              characters.map(({ hash, character, state }) => {

                const character_button = $(`<div><button>${character.name}</button></div>`)

                character_button.click(_ => {
                  selected_character = { hash, character, state }
                })

                $('.characters').append(character_button)
              })
            }

            if (selected_tile) {
              $('.selected-tile').show()
              $('.selected-tile').empty()

              const tile = x.game.world[selected_tile.x][selected_tile.y]

              const { assets, building } = tile
              const owner = tile.owner || 'None'

              $('.selected-tile').append(`<h3>${selected_tile.x}:${selected_tile.y} | Owner: ${owner}</h3>`)

              if (building) {
                $('.selected-tile').append(`<h3>${building.name} (lvl ${building.level})</h3>`)
                const upgrade_button = $(`<button class="upgrade-building">Upgrade Building</button>`)

                upgrade_button.click(() => {
                  console.log('click')
                  publish_action({
                    type: 'upgrade-building',
                    pos: selected_tile,
                  })
                })

                $('.selected-tile').append(upgrade_button)
              }

              tile.assets.map(w => {
                const asset = x.game.assets[w]
                $('.selected-tile').append(`<h4>${asset.asset.name}</h4>`)
              })
              Object.keys(tile.resources)
                .map(key => {
                  const value = tile.resources[key]
                  $('.selected-tile').append(`<h4>${key}:${value}</h4>`)
                })
            } else {
              $('.selected-tile').hide()
            }

            $('.trades').empty()

            x.game.trades.map(x => {
              $('.trades').append(`<div>${x.type}</div>`)
            })

            setTimeout(update, 500)
          })
          .catch(err => {
            console.error(err)

            setTimeout(update, 500)
          })
      }

      setTimeout(update, 500)
    })
})