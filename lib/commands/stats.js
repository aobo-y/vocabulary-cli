'use strict';

const _ = require('lodash')
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

        const score = args.options.score || 0
        const verbose = args.options.verbose || false

        const words = lists
          .map(list => collection.filterWords({list: list, score: score}))
          .reduce((prevWords, nextWords) => prevWords.concat(nextWords))

        const groups = _.groupBy(words, word => {
          return collection.get(word).score || 0
        })

        const initLogs = [
          '-------------------------------------------',
          `selected lists: ${lists.join(', ')}`,
          `minimum score: ${score}`,
          `number of words: ${words.length}`,
          '-------------------------------------------'
        ]

        const groupKeys = Object.keys(groups)
          .map(value => Number.parseInt(value))
          .sort((a, b) => a - b)

        const logs = groupKeys.map(groupKey => {
          const groupWords = groups[groupKey]

          const groupLog = [
            `score ${groupKey}: ${groupWords.length}`
          ]
          if (verbose) {
            groupLog.push(groupWords.join(' '), '\n')
          }

          return groupLog
        }).reduce(
          (prevGroupLog, nextGroupLog) => prevGroupLog.concat(nextGroupLog),
          initLogs
        )

        this.log(logs.join('\n'))
        callback()
      } catch (error) {
        this.log(error)
        callback()
      }
    });
}
