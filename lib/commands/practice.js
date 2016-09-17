'use strict';

const _ = require('lodash')
const chalk = require('chalk')

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
        const lists = parseListsInput(args.lists, collection)

        const score = args.options.score || 0
        const order = args.options.order || 'DEFAULT'
        const number = args.options.number

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
          default:
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

        startPractice(this, collection, words).then(stats => {
          var seconds = Math.round((stats.end - stats.start)/1000)

          this.log('-------------------------------------------')
          this.log('Practice Stats')
          this.log('number of words:', stats.y + stats.n)
          this.log('time consuming:', seconds < 60 ? seconds + ' s' : Math.round(seconds/60) + ' mins')
          this.log('knew:', stats.y)
          this.log('don\'t know:', stats.n)
          this.log('-------------------------------------------')

          callback()
        })
      } catch (error) {
        this.log(error)
        callback()
      }
    });
}

function startPractice(commandInstance, collection, words) {
  const stats = {
    y: 0,
    n: 0,
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
        stats.n++
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

function parseListsInput(lists, collection) {
  const listNumbers = collection.getListNumbers()

  if (!lists) return listNumbers

  let parsedLists = []

  for (let list of lists) {
    let parsedList
    if (/^\d+$/.test(list)) {
      parsedList = Number.parseInt(list)
      if (listNumbers.indexOf(parsedList) === -1) {
        throw `${list} is not a valid list`
      }

      parsedLists.push(parsedList)
    } else if (/^\d+-\d+$/.test(list)) {
      // cannot list.split('-').map(Number.parseInt) since map will pass value & index
      parsedList = list.split('-').map(n => Number.parseInt(n))

      if (parsedList[0] > parsedList[1]) {
        throw `${list} is not a valid lists range`
      }

      for (let i = parsedList[0]; i <= parsedList[1]; i++) {
        if (listNumbers.indexOf(i) === -1) {
          throw `${i} in ${list} is not a valid list`
        }
        parsedLists.push(i)
      }
    } else {
      throw `${list} is not a valid input, space separated integer, or hyphen linked integers for range`
    }
  }

  parsedLists = _.uniq(parsedLists)

  return parsedLists
}
