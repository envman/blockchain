const path = require('path')
const fs = require('fs-extra')
const moment = require('moment')

module.exports = ({ data_dir }) => {
  const log_file = path.join(data_dir, 'log.txt')
  const stamp = () => moment.utc().format()

  return fs.mkdirp(data_dir)
    .then(() => {
      return {
        error: msg => {
          fs.appendFile(log_file, `${stamp()}: ERROR: ${msg}`)
        },

        info: msg => {
          fs.appendFile(log_file, `${stamp()}: INFO: ${msg}`)
        },
      }
    })
}