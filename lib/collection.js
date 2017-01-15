'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const mkdirp = require('mkdirp')
const _ = require('lodash')

const userDataPath = process.env.NODE_ENV === 'production' ? '.vocabulary-cli' : '.vocabulary-cli-test'

class Collection {
  constructor(collectionName) {
    const collectionData = require(path.resolve(__dirname, '../data/', collectionName))
    const userCollectionPath = path.resolve(os.homedir(), userDataPath, 'collections', collectionName)
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
    this._words = Object.keys(collectionData)

    this._collectionData = collectionData
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

  clear(lists) {
    this._words.forEach(word => {
      const wordEntity = this.get(word)
      if (lists && lists.indexOf(wordEntity.listIndex) === -1) return;
      this.set(word, 'score', 0)
    })
  }

  get(word) {
    return Object.assign({}, this._collectionData[word], this._userData[word])
  }

  set(word, field, value) {
    if (!this._userData[word]) {
      this._userData[word] = {}
    }

    if (typeof field === 'string') {
      this._userData[word][field] = value
    } else if (typeof field === 'object') {
      Object.assign(this._userData[word], field)
    } else {
      return;
    }
    this._arrangeWrite()
  }

  getList(list) {
    return this._words.filter(word => this.get(word).listIndex === list)
  }

  getAll() {
    return this._words
  }

  getListNumbers() {
    return _.uniq(
      this._words.map(word => this.get(word).listIndex)
    ).sort(
      (a, b) => a - b
    )
  }

  increaseScore(word) {
    const wordEntity = this.get(word)
    let score = wordEntity.score || 0
    this.set(word, 'score', score + 1)
  }

  filterWords(opt) {
    const {
      listIndex,
      minScore,
      failedIn
    } = opt

    return this._words.filter(word => {
      const wordEntity = this.get(word)
      if (listIndex && wordEntity.listIndex !== listIndex) return false
      if (minScore) {
        const score = wordEntity.score || 0
        if (score < minScore) return false
      }
      if (failedIn) {
        const now = Date.now()
        const lastFailTs = wordEntity.lastFailTs
        if (!lastFailTs || (now - lastFailTs) > failedIn * 24 * 3600 * 1000) return false
      }
      return true
    })
  }
}

module.exports = Collection
