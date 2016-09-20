'use strict';

const nodePkg = require('../../package')

module.exports = function (client) {
  client
    .command(':version')
    .alias(':v')
    .description('Print the version.')
    .action(function(args, callback) {
      this.log(nodePkg.version)
      callback()
    })
}
