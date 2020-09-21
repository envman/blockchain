const express = require('express')
const fs = require('fs-extra')
const path = require('path')
const bodyParser = require('body-parser')
const createGame = require('./block/game')

module.exports = opts => {
  const app = express()

  app.use(bodyParser.json())

  createGame({ port: 9001, known: '127.0.0.1:9000', wipe: true, miner: true, ...opts })
    .then(game => {
      app.get('/test', (req, res) => {
        res.send('hello')
      })

      app.use('/', express.static('web'))

      app.get('/edit', (req, res) => {
        fs.readFile(path.join(__dirname, 'web', 'edit.html'), 'utf8')
          .then(x => res.send(x))
      })

      app.get('/dev', (req, res) => {
        fs.readFile(path.join(__dirname, 'web', 'dev.html'), 'utf8')
          .then(x => res.send(x))
      })

      app.get('/trades', (req, res) => {
        fs.readFile(path.join(__dirname, 'web', 'trades.html'), 'utf8')
          .then(x => res.send(x))
      })

      app.get('/view', (req, res) => {
        res.send(game.view())
      })

      app.post('/action', (req, res) => {
        game.action(req.body)

        res.send('OK')
      })

      app.get('/chain', (req, res) => {
        game.chain()
          .then(chain => res.json(chain))
      })

      app.get('/block/:hash', (req, res) => {
        game.block(req.params.hash)
          .then(block => res.json(block))
      })

      app.post('/save', (req, res) => {
        fs.mkdirp(path.join(__dirname, 'block', 'assets'))
          .then(_ => fs.writeFile(path.join(__dirname, 'block', 'assets', 'new.json'), JSON.stringify(req.body)))
          .then(_ => res.send('OK'))
      })

      app.listen(opts.web_port || 8080)
    })
}