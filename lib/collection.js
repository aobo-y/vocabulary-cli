'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const mkdirp = require('mkdirp')
const _ = require('lodash')

class Collection {
  constructor(collectionName) {
    const collectionData = require(path.resolve(__dirname, '../data/', collectionName))
    const userCollectionPath = path.resolve(os.homedir(), '.vocabulary-cli/collections', collectionName)
    mkdirp.sync(path.dirname(userCollectionPath))
    let userData = {}
    try {
      userData = fs.readFileSync(userCollectionPath, 'utf8')
      userData = JSON.parse(userData)
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e
      }
    }

    this._collectionPath = userCollectionPath
    this._data = _.merge(collectionData, userData)
    this._userData = userData
    this._writeTask = null;
  }

  _arrangeWrite() {
    if (!this._writeTask) {
      this._writeTask = setTimeout(this.save.bind(this), 10000)
    }
  }

  save() {
    fs.writeFile(this._collectionPath, JSON.stringify(this._userData), (err) => {
      this._writeTask = null
      if (err) return console.log('failed to save file', err)
      // console.log('collection saved')
    })
  }

  clear() {
    _.forEach(this._data, word => this.set(word, 'score', 0))
    this.save()
  }

  get(word) {
    return this._data[word]
  }

  set(word, field, value) {
    _.set(this._data, word + '.' + field, value)
    _.set(this._userData, word + '.' + field, value)
    this._arrangeWrite()
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
    let score = wordEntity.score || 0
    this.set(word, 'score', score + 1)
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
