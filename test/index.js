const { fork } = require('child_process')
const path = require('path')

const express = require('express')
const shortid = require('shortid')

const create_node = (port, web_port, known) => {
  const id = shortid()

  const args = ['true', id, port, web_port, path.join(__dirname, '..', 'test_data', id), id]

  if (known) {
    args.push(known)
  }

  const child = fork('../client/cli', args, {
    stdio: 'pipe',
    cwd: '../client'
  })

  child.stdout.setEncoding('utf8')
  child.stdout.on('data', x => console.log(`stdout: ${x}`))

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', x => console.log(`stderr: ${x}`))

  return { kill: _ => child.kill('SIGINT'), id, web_port }
}

const create_nodes = (node_count) => {
  const start_port = 9000
  const start_web_port = 8000

  const nodes = []

  for (let i = 0; i < node_count; i++) {
    const node = create_node(start_port + i, start_web_port + i, i > 0 && `127.0.0.1:${start_port + i - 1}`)
  
    nodes.push(node)
  }

  return nodes
}

const nodes = create_nodes(20)

const app = express()

app.use('/', express.static('web'))

app.get('/nodes', (req, res) => {
  res.json(nodes)
})

app.listen(7000)

const stop = () => {
  nodes.map(x => x.kill())

  setTimeout(() => {
    process.exit()
  }, 2000)
}

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received.')
  stop()
})

process.on('SIGINT', () => {
  console.log('SIGTERM signal received.')
  stop()
})
