'use strict'

const client = require('./lib/client')

process.on("SIGINT", function () {
  //graceful shutdown
  process.exit();
});

client
  .delimiter('voc-cli>')
  .show()
