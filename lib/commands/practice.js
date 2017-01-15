'use strict';

const _ = require('lodash')
const chalk = require('chalk')
const utils = require('./utils')

const REVOKE = '@vocabulary-cli/REVOKE'

module.exports = function (client) {
  client
    .command(':practice [lists...]')
    .alias(':p')
    .option('-s --score <score>', 'minimum score of words, default is 0')
    .option('-f --failed-in <days>', 'failed within how many days')
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

        const score = args.options.score || 0
        const failedIn = args.options['failed-in']
        const order = args.options.order || 'DEFAULT'
        const number = args.options.number

        let words = lists
          .map(list => collection.filterWords({
            listIndex: list,
            minScore: score,
            failedIn: failedIn
          }))
          .reduce((prevWords, nextWords) => prevWords.concat(nextWords))

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
            throw new Error(`Invalid order ${order}`)
        }

        if (number) words = words.slice(0, number)

        if (!words.length) {
          this.log('No macthed words')
          return callback()
        }
        this.log('-------------------------------------------')
        this.log('Practice Start')
        this.log(`selected lists: ${lists.join(', ')}`)
        this.log(`minimum score: ${score}`)
        if (failedIn) this.log(`failed in last: ${failedIn} day(s)`)
        this.log(`in ${order} order`)
        this.log('number of words:', words.length)
        this.log('-------------------------------------------')
        this.log('Enter to see meaning & Type Y/y for knowing the word')
        this.log('Type ABANDON to quit; REVOKE to undo :)')
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
    const score = wordEntity.score || 0

    return commandInstance.prompt([{
      type: 'input',
      name: 'seeMeaning',
      message: `${word} `
    }, {
      type: 'input',
      name: 'response',
      message: `${wordEntity.meaning}\n[?] <${score}>: `,
      validate: i => (index !== 0 || i !== 'REVOKE') ? true : 'This is the first word. Nothing to revoke.'
    }]).then(function (answers){
      const response = answers.response || ''

      if (response === 'ABANDON') return
      if (response === 'REVOKE') return REVOKE

      const currentTs = Date.now()
      const newWordEnity = {lastReviewTs: currentTs}
      const knew = response === word || response.toUpperCase() === 'Y'
      if (knew) {
        stats.y++
      } else {
        stats.n.push(word)

        newWordEnity.score = score + 1
        newWordEnity.lastFailTs = currentTs

        commandInstance.log(chalk.red(`[!] ${word} <${score} -> ${newWordEnity.score || 0}>`))
      }

      collection.set(word, newWordEnity)

      if (++index === words.length) return
      return promptWord(index).then(response => {
        if (response === REVOKE) {
          if (knew) {
            stats.y--
          } else {
            stats.n.pop()
          }
          collection.set(word, {
            score: wordEntity.score,
            lastReviewTs: wordEntity.lastReviewTs,
            lastFailTs: wordEntity.lastFailTs
          })
          return promptWord(--index);
        }
        return response
      })
    })
  }

  return promptWord()
    .catch(e => console.log('Error happened. Practice will stop', e))
    .then(() => {
      stats.end = new Date()
      return stats
    })
}
