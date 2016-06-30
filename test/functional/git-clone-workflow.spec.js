'use strict'

const path = require('path')
const exec = require('co-exec')
const expect = require('chai').expect
const launchUtils = require('./launch-utils')
const fsUtils = require('fs-utils')

const TEST_CACHE_DIR = path.join(__dirname, '../resources/test-cache-dir')
const TEST_MICROSERVICES_DIR = path.join(__dirname, '../resources/test-microservices')
const ROOT_MICROSERVICE_DIR = path.join(TEST_MICROSERVICES_DIR, 'microserviceRoot')
const STITCH_BIN = path.join(__dirname, '../../bin/stitch')

const MICROSERVICES_TO_TEST = [
  'microserviceA',
  'microserviceB',
  'microserviceC',
  'microserviceD',
]

describe('git clone workflow', function () {
  this.timeout(180 * 1000)
  this.bail(true)

  const processEnv = Object.assign({}, process.env, { STITCH_CACHE_DIR: TEST_CACHE_DIR })

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

    yield exec(`docker kill $(docker ps -f name=microservice -q)`)
  })

  it('should clone new repositories in the cache dir & use them in the final docker-compose', function * () {
    const cmd = `${STITCH_BIN} --with=microserviceA,microserviceB --with microserviceC --with=microserviceD `
      + `--registry=${launchUtils.REGISTRY_URL}`
    processInfo = yield launchUtils.launch(cmd, { cwd: ROOT_MICROSERVICE_DIR, env: processEnv })

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'clone-all')
  })

  // note: also tests mocks
  it.only('should pull cloned repos if they already exist before using them in the final docker-compose', function * () {
    yield MICROSERVICES_TO_TEST.map((serviceName) => checkoutOldCommit(serviceName))

    const cmd = `${STITCH_BIN} --with=microserviceA,microserviceC --registry=${launchUtils.REGISTRY_URL}`
    processInfo = yield launchUtils.launch(cmd, { cwd: ROOT_MICROSERVICE_DIR, env: processEnv  })

    for (let i = 0; i != MICROSERVICES_TO_TEST.length; ++i) {
      yield checkRepoAtLatestCommit(MICROSERVICES_TO_TEST[i])
    }

    const apiResponses = yield launchUtils.queryApis(processInfo.urls)
    launchUtils.checkApiResponsesMatchExpected(apiResponses, 'pull-with-mocks')
  })

  function checkoutOldCommit(serviceName) {
    return exec('git checkout HEAD^', { cwd: getServiceRepoPath(serviceName) })
  }

  // TODO: we need to be able to specify a 'default' branch to use when cloning/using & the ability to override branches
  function* checkRepoAtLatestCommit(serviceName) {
    const currentHead = yield exec('git rev-parse HEAD', { cwd: getServiceRepoPath(serviceName) })
    const latestHead = yield exec('get rev-parse master', { cwd: getServiceRepoPath(serviceName) })

    expect(currentHead).to.equal(latestHead)
  }

  function getServiceRepoPath(serviceName) {
    return path.join(TEST_CACHE_DIR, serviceName)
  }
})
