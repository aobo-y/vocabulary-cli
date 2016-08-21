'use strict'

module.exports = function (client) {
  client
    .command(':lookup <word>')
    .alias(':l')
    .description('Look up a word.')
    .action(function(args, callback) {
      const collection = client.context.collection

      if (!collection) {
        this.log('no selected collection')
        return callback()
      }

      let wordEntity = collection.get(args.word)
      if (!wordEntity) {
        this.log('not found')
      } else {
        this.log(args.word + '\n' + wordEntity.meaning)
      }

      callback()
    })

  client
    .catch('[words...]', 'Catches incorrect commands')
    .action(function (args, callback) {
      const words = args.words
      const collection = client.context.collection

      if (!collection) {
        this.log(words.join(' '), 'is not a valid commands')
        return callback()
      }

      const valid = words.every(word => /^[A-Za-z]+$/.test(word))
      if (!valid) {
        this.log(words.join[' '], 'is not a valid commands')
      } else {
        for (let word of words) {
          let wordEntity = collection.get(word)
          if (!wordEntity) {
            this.log(word + '\nnot found')
          } else {
            this.log(word + '\n' + wordEntity.meaning)
          }
        }
      }
      callback()
    })
}
