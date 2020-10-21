const path = require('path')
const fs = require('fs-extra')
const moment = require('moment')

module.exports = ({ data_root }) => {
  const log_file = path.join(data_root, 'log.txt')
  const error_file = path.join(data_root, 'errors.txt')

  const stamp = () => moment.utc().format()

  return fs.mkdirp(data_root)
    .then(() => {
      return {
        error: msg => {
          fs.appendFile(log_file, `${stamp()}: ERROR: ${msg} \r\n`)
          fs.appendFile(error_file, `${stamp()}: ERROR: ${msg} \r\n`)
        },

        info: msg => {
          fs.appendFile(log_file, `${stamp()}: INFO: ${msg} \r\n`)
        },
      }
    })
}