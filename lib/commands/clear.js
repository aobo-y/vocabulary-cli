'use strict'

const utils = require('./utils')

module.exports = function (client) {
  client
    .command(':clear [lists...]')
    .description('Clear the scores of specified lists in selected collection.')
    .validate(function() {
      if (!client.context.collection) return 'no selected collection'
    })
    .action(function(args, callback) {
      const collection = client.context.collection
      const lists = utils.parseListsInput(args.lists, collection)

      let commandInstance = this

      this.prompt({
        type: 'confirm',
        name: 'response',
        message: `Clear the scores of lists: ${lists.join(', ')}; confirm:`
      }, function (answers) {
        if (answers.response) {
          collection.clear(lists)
          commandInstance.log('lists cleared')
        } else {
          commandInstance.log('clear cancelled')
        }
        callback()
      })
    })
}
