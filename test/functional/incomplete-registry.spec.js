'use strict'

const path = require('path')
const expect = require('chai').expect
const launchUtils = require('./launch-utils')

const STITCH_BIN = path.join(__dirname, '../../bin/stitch')

describe('incomplete registry', function () {
  launchUtils.setUpFunctionalTestSuite(this)

  it('should work if a real service is used for one w/ no mocks and a mock service is used '
    + 'for one w/ no git repo', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceB --registry="${launchUtils.INCOMPLETE_REGISTRY_URL}"`
    const processInfo = yield launchUtils.launch(cmd)

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'incomplete')
  })

  it('should fail if a real service is requested for a service w/ no git repo', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceA,microserviceB --registry="${launchUtils.INCOMPLETE_REGISTRY_URL}"`

    let stdout
    try {
      yield launchUtils.launch(cmd)
    } catch (e) {
      stdout = e.stdout
    }

    expect(stdout).to.match(/Service 'microserviceA' has no git repo in the registry/)
  })

  it('should fail if mocks are requested for one w/ no mock config', function * () {
    const cmd = `${STITCH_BIN} --registry="${launchUtils.INCOMPLETE_REGISTRY_URL}"`

    let stdout
    try {
      yield launchUtils.launch(cmd)
    } catch (e) {
      stdout = e.stdout
    }

    expect(stdout).to.match(
      /Cannot find mocks for service 'microserviceB', make sure the service has a mocks section in the registry/)
  })
})
