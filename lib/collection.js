'use strict'

const fs = require('fs')
const _ = require('lodash')

class Collection {
  constructor(collectionPath) {
    const content = fs.readFileSync(collectionPath, 'utf8')
    this._collectionPath = collectionPath
    this._data = JSON.parse(content)
    this._writeTask = null;
  }

  _arrangeWrite() {
    if (!this._writeTask) {
      this._writeTask = setTimeout(this.save.bind(this), 10000)
    }
  }

  save() {
    fs.writeFile(this._collectionPath, JSON.stringify(this._data, null, 2), (err) => {
      this._writeTask = null
      if (err) return console.log('failed to save file', err)
      // console.log('collection saved')
    })
  }

  get(word) {
    return this._data[word]
  }

  getList(list) {
    return _.pickBy(this._data, word => word.listIndex === list)
  }

  getAll() {
    return this._data
  }

  getListNumbers() {
    return _.uniq(_.map(this._data, word => word.listIndex)).sort((a, b) => a - b)
  }

  increaseScore(word) {
    const wordEntity = this.get(word)
    if (!wordEntity.score) {
      wordEntity.score = 0
    }
    wordEntity.score++
    this._arrangeWrite()
  }

  filterWords(opt) {
    const listIndex = opt.list
    const minScore = opt.score

    return _.pickBy(this._data, word => {
      if (listIndex && word.listIndex !== listIndex) return false
      if (minScore) {
        const score = word.score || 0
        if (score < minScore) return false
      }
      return true
    })
  }
}

module.exports = Collection
