'use strict'

const path = require('path')
const expect = require('chai').expect
const launchUtils = require('./launch-utils')

const TEST_MICROSERVICES_DIR = path.join(__dirname, '../resources/test-microservices')
const LOCAL_MICROSERVICE_NO_PUBLIC = path.join(TEST_MICROSERVICES_DIR, 'microserviceNoPublic')
const STITCH_BIN = path.join(__dirname, '../../bin/stitch')

describe('no public interface', function () {
  launchUtils.setUpFunctionalTestSuite(this)

  const processEnv = {
    STITCH_REGISTRY: launchUtils.REGISTRY_URL,
  }

  it.only('should launch services w/o public interfaces correctly', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceA --link "${LOCAL_MICROSERVICE_NO_PUBLIC}"`
    const processInfo = yield launchUtils.launch(cmd, { env: processEnv })

    expect(processInfo.stdout).to.match(/microserviceNoPublic started successfully/)

    yield timeout(15000)

    expect(processInfo.stdout).to.match(/still doin nuthin/)
  })
})

function timeout(ms) {
  return function (cb) {
    setTimeout(cb, ms)
  }
}
