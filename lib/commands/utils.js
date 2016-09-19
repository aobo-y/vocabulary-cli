'use strict'

const _ = require('lodash')

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

module.exports = {
  parseListsInput: parseListsInput
}
