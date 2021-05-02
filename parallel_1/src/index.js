const blue = require('bluebird')
const request  = require('request')
const cc  = require('coffee-script')
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const init = async () => {
  console.log(process.env)
  while (1) {
    await sleep(10000)
  }
}

init()
