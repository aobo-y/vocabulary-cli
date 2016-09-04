'use strict';

const path = require('path')
const Collection = require('../collection')

module.exports = function (client) {
  client
    .command(':select <collection>')
    .alias(':s')
    .description('Select your vocabulary collection.')
    .action(function(args, callback) {
      const collectionName = args.collection

      try {
        client.context.collection = new Collection(collectionName)
      } catch (e) {
        this.log(e)
        callback()
      }

      const name = path.basename(collectionName, path.extname(collectionName))
      client.delimiter(name + '>')
      callback()
    })
}
