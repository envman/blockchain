const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

const color_canvas = document.getElementById('colors')
const color_ctx = color_canvas.getContext("2d")

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

const grid = []
for (let x = 0; x < width; x++) {
  grid [x] = []

  for (let y = 0; y < height; y++) {
    grid[x][y] = 1
  }
}

// 0   0   0	Black
// 87  87  87	Dk. Gray
// 160 160 160	Lt. Gray
// 255 255 255	White
// 42  75 215	Blue
// 29 105  20	Green
// 129  74  25	Brown
// 129  38 192	Purple
// 157 175 255	Lt. Blue
// 129 197 122	Lt. Green
// 233 222 187	Tan
// 173  35  35	Red
// 41 208 208	Cyan
// 255 238  51	Yellow
// 255 146  51	Orange
// 255 205 243	Pink

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

let selected_color = 1

canvas.addEventListener('click', e => {
  const x = e.offsetX
  const y = e.offsetY

  const pos = {
    x: Math.floor(x / square.width),
    y: Math.floor(y / square.height),
  }

  grid[pos.x][pos.y] = selected_color
})

const color_height = 20
const color_width = 200

color_canvas.addEventListener('click', e => {
  const x = e.offsetX
  const y = e.offsetY

  if (y > 600) {
    fetch(`${window.location.origin}/save`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify(grid)
    })
    return
  }

  const selected = Math.floor(y / color_height)

  if (colors[selected]) {
    selected_color = selected
  }  
})

const draw = () => {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      ctx.fillStyle = "#000000"
      ctx.fillRect(x * square.height, y * square.width, square.height, square.width)
  
      ctx.fillStyle = colors[grid[x][y]]
      ctx.fillRect((x * square.height) + 1, (y * square.width) + 1, square.height - 2, square.width - 2)
    }
  }

  for (let color of Object.keys(colors)) {
    const index = Object.keys(colors).indexOf(color)

    if (selected_color == color) {
      color_ctx.fillStyle = "#DB4EE4"
    } else {
      color_ctx.fillStyle = "#000000"
    }
    
    color_ctx.fillRect(0, index * color_height, color_width, color_height)

    color_ctx.fillStyle = colors[color]
    color_ctx.fillRect(2, (index * color_height) + 2, color_width - 4, color_height - 4)
  }

  const start = Object.keys(colors).length * color_height
  const block_size = 4

  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      color_ctx.fillStyle = colors[grid[x][y]]
      color_ctx.fillRect(block_size * x, (start + (y * block_size)), block_size, block_size)
    }
  }

  color_ctx.fillStyle = "#000000"
  color_ctx.fillRect(0, 600, 200, 200)

  setTimeout(draw, 100)
}

draw()