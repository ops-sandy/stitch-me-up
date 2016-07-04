'use strict'

const co = require('co')
const fs = require('fs')
const path = require('path')
const fsUtils = require('fs-utils')
const exec = require('child_process').exec
const coExec = require('co-exec')
const request = require('request-promise')
const expect = require('chai').expect

const TEST_CACHE_DIR = path.join(__dirname, '../resources/test-cache-dir')
const TEST_MICROSERVICES_DIR = path.join(__dirname, '../resources/test-microservices')
const ROOT_MICROSERVICE_DIR = path.join(TEST_MICROSERVICES_DIR, 'microserviceRoot')
const FINISHED_LAUNCHING_REGEX = /(microservice[a-zA-Z]+) listening on/g
const MICROSERVICE_COUNT = 5

module.exports = {
  REGISTRY_URL: 'https://raw.githubusercontent.com/diosmosis/stitch-me-up-test-registry/master/services.json',
  INCOMPLETE_REGISTRY_URL:
    'https://raw.githubusercontent.com/diosmosis/stitch-me-up-test-registry/master/incomplete-services.json',
  queryApis,
  launch,
  checkApiResponsesMatchExpected,
  setUpFunctionalTestSuite,
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

const debugFile = fs.createWriteStream('stitch-debug.log', { flags: 'a' })

function setUpFunctionalTestSuite(suite) {
  suite.timeout(180 * 1000)
  suite.bail(true)

  before(function * () {
    try {
      yield coExec(`rm -r "${TEST_CACHE_DIR}"`)
    } catch (e) {
      // ignore
    }

    expect(fsUtils.isDir(TEST_CACHE_DIR)).to.be.false
  })

  afterEach(function * () {
    yield coExec('docker kill $(docker ps -f name=microservice -q) || true')
  })
}

function launch(cmd, inOptions) {
  const options = inOptions || {}

  options.env = Object.assign({}, process.env, { STITCH_CACHE_DIR: TEST_CACHE_DIR }, options.env || {})
  options.cwd = options.cwd || ROOT_MICROSERVICE_DIR

  return co(function* launchImpl() {
    debugFile.write(`*** starting ${cmd} ***\n`)

    const urls = {}
    let allStdout = ''

    yield new Promise((resolve, reject) => {
      let interval = null
      let resolved = false

      const process = exec(cmd, options)

      process.stdout.on('data', (data) => {
        allStdout += data.toString()
        debugFile.write(data)
      })

      process.stderr.on('data', (data) => {
        debugFile.write(data)
      })

      process.on('exit', (code) => {
        if (resolved) {
          return
        }

        clearInterval(interval)
        resolved = true

        const error = new Error(`stitch failed w/ error code ${code}`)
        error.stdout = allStdout

        reject(error)
      })

      interval = setInterval(function () {
        let regexResult
        // eslint-disable-next-line no-cond-assign
        while ((regexResult = FINISHED_LAUNCHING_REGEX.exec(allStdout)) !== null) {
          const microservice = regexResult[1]

          const urlMatch = new RegExp(`Launching ${microservice} at (.*)$`, 'gm').exec(allStdout)
          if (urlMatch) {
            urls[microservice] = urlMatch[1]
          }
        }

        if (Object.keys(urls).length === MICROSERVICE_COUNT) {
          finish()
        }
      }, 5000)

      function finish() {
        if (resolved) {
          return
        }

        clearInterval(interval)
        resolved = true

        setTimeout(resolve, 10000)
      }
    })

    return {
      process,
      urls,
      stdout: allStdout,
    }
  })
}

function checkApiResponsesMatchExpected(apiResponses, testName) {
  const processedPath = path.join(__dirname, 'responses', `${testName}.processed.json`)
  const expectedPath = path.join(__dirname, 'responses', `${testName}.expected.json`)

  fs.writeFileSync(processedPath, JSON.stringify(apiResponses))

  expect(apiResponses).to.deep.equal(require(expectedPath))
}
