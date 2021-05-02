const joi = require('joi')
const chalk = require('chalk')
const mysql = require('mysql')
const aa = require('aws-amplify')
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
