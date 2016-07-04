'use strict'

const path = require('path')
const launchUtils = require('./launch-utils')

const TEST_MICROSERVICES_DIR = path.join(__dirname, '../resources/test-microservices')
const LOCAL_MICROSERVICE_D = path.join(TEST_MICROSERVICES_DIR, 'microserviceD')
const STITCH_BIN = path.join(__dirname, '../../bin/stitch')

describe('local checkout workflow', function () {
  launchUtils.setUpFunctionalTestSuite(this)

  const processEnv = {
    STITCH_REGISTRY: launchUtils.REGISTRY_URL,
  }

  it('should link to local code if --link is used, but clone other repos', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceA --link "${LOCAL_MICROSERVICE_D}"`
    const processInfo = yield launchUtils.launch(cmd, { env: processEnv })

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'links')
  })
})
