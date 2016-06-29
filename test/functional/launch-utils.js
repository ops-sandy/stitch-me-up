'use strict'

const co = require('co')
const fs = require('fs')
const exec = require('child_process').exec
const request = require('request-promise')

const FINISHED_LAUNCHING_REGEX = /(microservice[a-zA-Z]+) listening on/g
const MICROSERVICE_COUNT = 4

module.exports = {
  REGISTRY_URL: 'https://raw.githubusercontent.com/diosmosis/stitch-me-up-test-registry/master/services.json',

  queryApis: queryApis,

  launch: launch,
}

function queryApis(urls) {
  return {
    'microserviceA/service-a': request.get(`${urls.microserviceA}/service-a`),
    'microserviceB/service-b': request.get(`${urls.microserviceB}/service-b`),
    'microserviceC/service-c': request.get(`${urls.microserviceC}/service-c`),
    'microserviceC/service-c2': request.get(`${urls.microserviceC}/service-c2`),
    'microserviceD/service-d': request.get(`${urls.microserviceD}/service-d`),
    'microserviceRoot/root': request.get(`${urls.microserviceRoot}/root`),
  }
}

function launch(cmd, options) {
  return co(function* launchImpl() {
    const debugFile = fs.createWriteStream('stitch-debug.log', { flags: 'a' })
    debugFile.write(`*** starting ${cmd} ***\n`)

    const urls = {}

    yield new Promise((resolve, reject) => {
      let resolved = false

      const process = exec(cmd, options)

      let allStdout = ''
      process.stdout.on('data', (data) => {
        allStdout += data.toString()

        let regexResult
        while ((regexResult = FINISHED_LAUNCHING_REGEX.exec(allStdout)) !== null) {
          const microservice = regexResult[1]

          const urlMatch = allStdout.match(new RegExp(`Launching ${microservice} at (.*)$`, 'gm'))
          if (urlMatch) {
            urls[urlMatch[1]] = urlMatch[2]
          }
        }

        debugFile.write(data)

        if (Object.keys(urls).length === MICROSERVICE_COUNT) {
          finish()
        }
      })

      process.stderr.on('data', (data) => {
        debugFile.write(data)
      })

      process.on('exit', (code) => {
        reject(new Error(`stitch failed w/ error code ${code}`))
      })

      function finish() {
        if (resolved) {
          return
        }

        resolved = true
        resolve()
      }
    })

    return {
      process,
      urls,
    }
  })
}
