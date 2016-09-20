'use strict';

const utils = require('./utils')

module.exports = function (client) {
  client
    .command(':stats [lists...]')
    .option('-v --verbose', 'print verbose result including all words')
    .option('-s --score <score>', 'minimum score of words, default is 0')
    .description('print the statistics of specified lists in selected collection.')
    .validate(function() {
      if (!client.context.collection) return 'no selected collection'
    })
    .action(function(args, callback) {
      try {
        const collection = client.context.collection
        const lists = utils.parseListsInput(args.lists, collection)

        let score = args.options.score || 0
        let verbose = args.options.verbose || false

        let selectedWords = {}

        for (let list of lists) {
          Object.assign(selectedWords, collection.filterWords({list: list, score: score}))
        }

        let groups = []
        for (let word of Object.keys(selectedWords)) {
          let wordEntity = selectedWords[word]
          let score = wordEntity.score || 0
          if (!groups[score]) {
            groups[score] = []
          }
          groups[score].push(word)
        }

        let numberOfWords = Object.keys(selectedWords).length

        let logs = [
          '-------------------------------------------',
          `selected lists: ${lists.join(', ')}`,
          `minimum score: ${score}`,
          `number of words: ${numberOfWords}`,
          '-------------------------------------------'
        ]

        let groupKeys = Object.keys(groups)
          .map(value => Number.parseInt(value))
          .sort((a, b) => a - b)

        for (let groupKey of groupKeys) {
          let words = groups[groupKey]
          let groupLog = [
            `score ${groupKey}: ${words.length}`
          ]
          if (verbose) {
            groupLog.push(words.join(' '), '\n')
          }
          logs.push.apply(logs, groupLog)
        }

        this.log(logs.join('\n'))
        callback()
      } catch (error) {
        this.log(error)
        callback()
      }
    });
}
