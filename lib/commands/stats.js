'use strict';

const _ = require('lodash')
const utils = require('./utils')

module.exports = function (client) {
  client
    .command(':stats [lists...]')
    .option('-v --verbose', 'print verbose result including all words')
    .option('-s --score <score>', 'minimum score of words, default is 0')
    .option('-f --failed-in <days>', 'failed within how many days')
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
        const failedIn = args.options['failed-in']

        const words = lists
          .map(list => collection.filterWords({
            listIndex: list,
            minScore: score,
            failedIn: failedIn
          }))
          .reduce((prevWords, nextWords) => prevWords.concat(nextWords))

        const groups = _.groupBy(words, word => {
          return collection.get(word).score || 0
        })

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
          []
        )

        this.log('-------------------------------------------')
        this.log(`selected lists: ${lists.join(', ')}`)
        this.log(`minimum score: ${score}`)
        if (failedIn) this.log(`failed in last: ${failedIn} day(s)`)
        this.log(`number of words: ${words.length}`)
        this.log('-------------------------------------------')

        this.log(logs.join('\n'))

        callback()
      } catch (error) {
        this.log(error)
        callback()
      }
    });
}
