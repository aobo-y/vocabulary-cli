'use strict';

const _ = require('lodash')
const chalk = require('chalk')
const utils = require('./utils')

module.exports = function (client) {
  client
    .command(':practice [lists...]')
    .alias(':p')
    .option('-s --score <score>', 'minimum score of words, default is 0')
    .option('-o --order <order>', 'order of words, if not specify, will keep the default order', ['ASC', 'DESC', 'RANDOM', 'DEFAULT'])
    .option('-n --number <number>', 'maxium number of words, unlimited if not specified')
    .description('practice specified lists of words in selected collection.')
    .validate(function() {
      if (!client.context.collection) return 'no selected collection'
    })
    .action(function(args, callback) {
      try {
        const collection = client.context.collection
        const lists = utils.parseListsInput(args.lists, collection)

        let score = args.options.score || 0
        let order = args.options.order || 'DEFAULT'
        let number = args.options.number

        let selectedWords = {}

        for (let list of lists) {
          Object.assign(selectedWords, collection.filterWords({list: list, score: score}))
        }

        let words = Object.keys(selectedWords)

        switch (order) {
          case 'ASC':
            words.sort()
            break;
          case 'DESC':
            words.sort((a, b) => a > b ? -1 : 1)
            break;
          case 'RANDOM':
            words = _.shuffle(words)
            break;
          case 'DEFAULT':
            break;
          default:
            order = 'DEFAULT'
            break;
        }

        if (number) words = words.slice(0, number)

        if (!words.length) {
          this.log('No macthed words')
          return callback()
        }
        this.log('-------------------------------------------')
        this.log('Practice Start')
        this.log(`selected lists: ${lists.join(', ')}\nminimum score: ${score}\nin ${order} order`)
        this.log('number of words:', words.length)
        this.log('-------------------------------------------')
        this.log('Enter to see meaning & Type Y/y for knowing the word')
        this.log('Type ABANDON to quit :)')
        this.log('-------------------------------------------')
        this.log('\n')

        iteratePractice(this, collection, words).then(callback)
      } catch (error) {
        this.log(error)
        callback()
      }
    });
}

function iteratePractice(commandInstance, collection, words) {
  return startPractice(commandInstance, collection, words).then(stats => {
    let seconds = Math.round((stats.end - stats.start)/1000)

    let statsLog = [
      '-------------------------------------------',
      'Practice Stats',
      'number of words: ' + (stats.y + stats.n.length),
      'time consuming: ' + (seconds < 60 ? seconds + ' s' : Math.round(seconds/60) + ' mins'),
      'knew: ' + stats.y,
      'don\'t know: ' + stats.n.length,
      '-------------------------------------------'
    ].join('\n')

    commandInstance.log(statsLog)

    if (stats.n.length > 0) {
      return commandInstance.prompt({
        type: 'confirm',
        name: 'iterate',
        message: 'Iterate with unknown words',
        default: true
      }).then(function (answer) {
        if (answer.iterate) {
          return iteratePractice(commandInstance, collection, stats.n)
        }
      })
    }
  })
}

function startPractice(commandInstance, collection, words) {
  const stats = {
    y: 0,
    n: [],
    start: new Date()
  }

  function promptWord(index) {
    index = index || 0
    const word = words[index]
    const wordEntity = collection.get(word)

    return commandInstance.prompt([{
      type: 'input',
      name: 'seeMeaning',
      message: `${word} <${wordEntity.score || 0}> `
    }, {
      type: 'input',
      name: 'response',
      message: `${wordEntity.meaning}\n[?]: `
    }]).then(function (answers){
      const response = answers.response || ''

      if (response === 'ABANDON') return

      if (response === word || response.toUpperCase() === 'Y') {
        stats.y++
      } else {
        stats.n.push(word)
        collection.increaseScore(word)
        const newWordEnity = collection.get(word)
        commandInstance.log(chalk.red(`[!]: ${word} <${newWordEnity.score || 0}> `))
      }

      if (++index === words.length) return
      return promptWord(index)
    })
  }

  return promptWord()
    .catch(e => console.log('Error happened. Practice will stop', e))
    .then(() => {
      stats.end = new Date()
      return stats
    })
}
