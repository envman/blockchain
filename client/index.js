const fs = require('fs-extra')
const path = require('path')
const client = require('./client')

const user_options = JSON.parse(fs.readFileSync(path.join(__dirname, 'options.json')))

client(user_options)