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

const window_size = {
  height: 800,
  width: 800
}

const height = 16
const width = 16

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

      ctx.fillStyle = colors[tile.style]

      if (tile.resources.tree) {
        ctx.fillStyle = 'gray'
      }

      if (tile.resources.stone) {
        ctx.fillStyle = 'green'
      }

      ctx.fillRect((x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)

      ctx.font = '14px serif';
      ctx.fillStyle = "#000000"

      ctx.fillText(`${tile.assets.length}`, (x * square.width) + 2, (y * square.height) + 45)

      if (tile.building) {
        ctx.font = '24px serif';
        ctx.fillStyle = "#000000"
        ctx.fillText(tile.building.code, (x * square.width) + 20, (y * square.height) + 25)
      }
    }
  }
}

let mode
let mode_data
let selected_tile

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

canvas.addEventListener('click', e => {
  const x = e.offsetX
  const y = e.offsetY

  const pos = {
    x: Math.floor(x / square.width),
    y: Math.floor(y / square.height),
  }

  if (!mode) {
    selected_tile = pos

    return
  }

  const data = mode_data || {}

  const body = {
    type: mode,
    pos,
    ...data
  }

  publish_action(body)
})

$(() => {
  const update = () => {
    fetch(`${window.location.origin}/view`, {})
    .then(res => res.json())
    .then(x => {
      draw(x)

      $('.user').text(`User: ${x.user.username}`)
      $('.turn').text(`Turn: ${x.game.turn}`)
      $('.cash').html(x.user.cash)

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

        assets.map(w => {
          const asset = x.game.assets[w]
          $('.selected-tile').append(`<h4>${asset.name}</h4>`)

          // const span = $(`<span></span>`)
          // const button = $(`<button class="move-worker">Move Worker</button>`)

          // button.click(() => {
          //   mode = 'move-worker'
          //   mode_data = {
          //     from: selected_tile
          //   }
          // })

          // span.append(button)

          // $('.selected-tile').append(span)
        })
      } else {
        $('.selected-tile').hide()
      }

      // x.game.users
      //   .sort((a, b) => b.cash - a.cash)
      //   .slice(0, 10)
      //   .filter(x => x.cash > 0)
      //   .map((x, i) => {
      //     $(`.player-${i + 1}`).html(x.username)
      //     $(`.player-${i + 1}-cash`).html(x.cash)
      //   })

      $('.trades').empty()

      x.game.trades.map(x => {
        $('.trades').append(`<div>${x.type}</div>`)
      })

      // console.log(x.game.trades)

      setTimeout(update, 500)
    })
    .catch(() => {
      setTimeout(update, 500)
    })
  }

  setTimeout(update, 500)
})