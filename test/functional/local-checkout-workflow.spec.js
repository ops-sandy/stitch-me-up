'use strict'

const path = require('path')
const exec = require('co-exec')
const expect = require('chai').expect
const fsUtils = require('fs-utils')
const launchUtils = require('./launch-utils')

const TEST_CACHE_DIR = path.join(__dirname, '../resources/test-cache-dir')
const TEST_MICROSERVICES_DIR = path.join(__dirname, '../resources/test-microservices')
const ROOT_MICROSERVICE_DIR = path.join(TEST_MICROSERVICES_DIR, 'microserviceRoot')
const LOCAL_MICROSERVICE_D = path.join(TEST_MICROSERVICES_DIR, 'microserviceD')
const STITCH_BIN = path.join(__dirname, '../../bin/stitch')

describe('local-checkout-workflow', function () {
  this.timeout(180 * 1000)

  const processEnv = Object.assign({}, process.env, {
    STITCH_CACHE_DIR: TEST_CACHE_DIR,
    STITCH_REGISTRY: launchUtils.REGISTRY_URL,
  })

  before(function * () {
    try {
      yield exec(`rm -r "${TEST_CACHE_DIR}"`)
    } catch (e) {
      // ignore
    }

    expect(fsUtils.isDir(TEST_CACHE_DIR)).to.be.false
  })

  let processInfo
  afterEach(function * () {
    if (processInfo) {
      try {
        processInfo.process.kill()
      } catch (err) {
        console.log('Failed to kill process:', err)
      }
    }

    yield exec('docker kill $(docker ps -f name=microservice -q)')
  })

  it('should link to local code if --link is used, but clone other repos', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceA --link "${LOCAL_MICROSERVICE_D}"`
    processInfo = yield launchUtils.launch(cmd, { cwd: ROOT_MICROSERVICE_DIR, env: processEnv })

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'links')
  })
})
