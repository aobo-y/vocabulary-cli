'use strict'

const client = require('vorpal')();
const commands = [
  './commands/select',
  './commands/lookup',
  './commands/practice',
  './commands/clear',
  './commands/stats',
  './commands/version'
].map(require)

client.context = {
  collection: null
}

commands.forEach((command) => command(client))

module.exports = client
