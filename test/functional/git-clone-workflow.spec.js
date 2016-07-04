'use strict'

const path = require('path')
const exec = require('co-exec')
const expect = require('chai').expect
const launchUtils = require('./launch-utils')

const TEST_CACHE_DIR = path.join(__dirname, '../resources/test-cache-dir')
const STITCH_BIN = path.join(__dirname, '../../bin/stitch')

const MICROSERVICES_TO_TEST = [
  'microserviceA',
  'microserviceB',
  'microserviceC',
  'microserviceD',
]

describe('git clone workflow', function () {
  launchUtils.setUpFunctionalTestSuite(this)

  it('should clone new repositories in the cache dir & use them in the final docker-compose', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceA,microserviceB --with microserviceC --with=microserviceD `
      + `--registry=${launchUtils.REGISTRY_URL}`
    const processInfo = yield launchUtils.launch(cmd)

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'clone-all')
  })

  // note: this also tests usage of mock services
  it('should pull cloned repos if they already exist before using them in the final docker-compose', function * () {
    console.log('Checking out old commits...')
    yield MICROSERVICES_TO_TEST.map(checkoutOldCommit)
    console.log('...Done.')

    const cmd = `${STITCH_BIN} --with=microserviceA,microserviceC --registry=${launchUtils.REGISTRY_URL}`
    const processInfo = yield launchUtils.launch(cmd)

    yield checkRepoAtLatestCommit('microserviceA')
    yield checkRepoAtLatestCommit('microserviceB-mocks', 'develop')
    yield checkRepoAtLatestCommit('microserviceC')
    yield checkRepoAtLatestCommit('microserviceD-mocks', '1.0.0')

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'pull-with-mocks')
  })

  it('should use the branch/tag instead of the registry default when specified on the command line', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceA#special --with=microserviceC#special`
      + ` --registry=${launchUtils.REGISTRY_URL}`
    const processInfo = yield launchUtils.launch(cmd)

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'special-branches')
  })

  function checkoutOldCommit(serviceName) {
    return exec('git checkout master^', { cwd: getServiceRepoPath(serviceName) })
  }

  function* checkRepoAtLatestCommit(serviceName, branch) {
    console.log(`Checking ${serviceName} is at latest commit...`)

    const currentHead = yield exec('git rev-parse HEAD', { cwd: getServiceRepoPath(serviceName) })
    const latestHead = yield exec(`git rev-parse ${branch || 'master'}`, { cwd: getServiceRepoPath(serviceName) })

    expect(currentHead).to.equal(latestHead)
  }

  function getServiceRepoPath(serviceName) {
    return path.join(TEST_CACHE_DIR, serviceName)
  }
})
