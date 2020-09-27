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

const loadImage = image => {
  return new Promise((resolve, _) => {
    const img = new Image()
    img.src = image
    img.onload = _ => resolve(img)
  })
}

let tree
let grass
let stone
let character
let log
let logs

loadImage('/img/tree.png')
  .then(x => tree = x)

loadImage('/img/grass.png')
  .then(x => grass = x)

loadImage('/img/stone.png')
  .then(x => stone = x)

loadImage('/img/character.png')
  .then(x => character = x)

loadImage('/img/logs.png')
  .then(x => logs = x)

loadImage('/img/log.png')
  .then(x => log = x)

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

const draw = ({ game, user }) => {
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

      if (grass) {
        ctx.drawImage(grass, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      ctx.font = '14px serif';
      ctx.fillStyle = "#000000"

      ctx.fillText(`${tile.assets.length}`, (x * square.width) + 2, (y * square.height) + 45)

      if (tile.building) {
        ctx.font = '24px serif';
        ctx.fillStyle = "#000000"
        ctx.fillText(tile.building.code, (x * square.width) + 20, (y * square.height) + 25)
      }

      if (tile.resources.tree && tree) {
        ctx.drawImage(tree, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.resources.stone && stone) {
        ctx.drawImage(stone, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.resources.wood && log && logs) {
        const image = tile.resources.wood > 1 ? logs : log

        ctx.drawImage(image, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
      }

      if (tile.assets.length > 0 && character) {
        ctx.drawImage(character, (x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
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
  const update = () => {
    fetch(`${window.location.origin}/view`, {})
      .then(res => res.json())
      .then(x => {
        draw(x)
        $('.user').text(`User: ${x.user.username}`)
        $('.turn').text(`Turn: ${x.game.turn}`)
        $('.cash').html(x.user.cash)

        $('.action-builder').empty()

        const action = current_action && current_action()
        if (action) {
          $('.action-builder').append(`<h3>${action.name}<h3>`)
        }

        const characters = x.user.assets.map(a => ({ hash: a, character: x.game.assets[a].asset }))

        $('.characters').empty()
        if (selected_character) {
          $('.characters').append(`<h2>${selected_character.character.name}</h2>`)

          const move_button = $('<button>move</button>')
          move_button.click(_ => {
            const action = {
              type: 'move',
              character: selected_character.hash
            }

            action_builder([
              selectPosition('Select target location', x => action.to = x),
              publish(action)
            ])
          })
          $('.characters').append(move_button)

          const chop_button = $('<button>chop</button>')
          chop_button.click(_ => {
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
          $('.characters').append(chop_button)
        } else {
          characters.map(({ hash, character }) => {
            const character_button = $(`<div><button>${character.name}</button></div>`)

            character_button.click(_ => {
              selected_character = { hash, character }
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