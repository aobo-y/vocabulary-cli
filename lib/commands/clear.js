'use strict'

module.exports = function (client) {
  client
    .command(':clear')
    .description('Clear the scores of the selected collection.')
    .action(function(args, callback) {
      const collection = client.context.collection

      if (!collection) {
        this.log('no selected collection')
        return callback()
      }

      let commandInstance = this

      this.prompt({
        type: 'confirm',
        name: 'response',
        message: 'confirm:'
      }, function (answers) {
        if (answers.response) {
          collection.clear()
          commandInstance.log('collection cleared')
        } else {
          commandInstance.log('clear cancelled')
        }
        callback()
      })
    })
}
