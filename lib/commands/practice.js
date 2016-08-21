'use strict';

const _ = require('lodash')

module.exports = function (client) {
  client
    .command(':practice [lists...]')
    .alias(':p')
    .option('-s --score <score>', 'minimum score of words, default is 0')
    .option('-o --order <order>', 'order of words, if not specify, will keep the default order', ['ASC', 'DESC', 'RANDOM', 'DEFAULT'])
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

        this.log('start to practice')
        this.log(`selected lists: ${lists.join(', ')}; minimum score: ${score}; in ${order} order`)
        this.log('number of words:', words.length)
        this.log('Type the word or Y for knowing the word')
        this.log('\n')

        promptWord.call(this, client, words).then(callback).catch(err => {
          console.log(err)
          callback()
        })
      } catch (error) {
        this.log(error)
        callback()
      }
    });
}

function promptWord(client, words, index) {
  const _this = this

  index = index || 0
  const collection = client.context.collection

  const word = words[index]
  const wordEntity = collection.get(word)

  return this.prompt({
    type: 'input',
    name: 'response',
    message: `? ${word} [${wordEntity.score || 0}]: `
  }).then(function (answers){
    const response = answers.response

    client.log(wordEntity.meaning)

    if (response === word || response === 'Y') {
      client.log('you knew the word')
    } else {
      client.log('you don\'t know the word')
      collection.increaseScore(word)
    }

    return promptWord.call(_this, client, words, ++index)
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
