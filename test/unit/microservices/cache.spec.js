'use strict'

const path = require('path')
const execSync = require('child_process').execSync
const fs = require('fs')
const mockRequire = require('mock-require')
const expect = require('chai').expect

const TEST_CACHE_DIR = path.join(__dirname, '../../resources/test-cache-dir')
const ROOT_PROJECT_DIR = path.join(__dirname, '../../..')

describe('MicroserviceCache', function () {
  describe('#getCodebase()', function () {
    let commands = []
    beforeEach(function () {
      commands = []
    })

    before(function () {
      mockRequire('co-exec', function* (command, options) {
        commands.push([command, options.cwd.replace(ROOT_PROJECT_DIR, '')])
      })
    })

    after(function () {
      mockRequire.stopAll()
    })

    let microserviceCache
    beforeEach(function () {
      const MicroserviceCache = mockRequire.reRequire('../../../lib/microservice/cache')
      microserviceCache = new MicroserviceCache(TEST_CACHE_DIR)

      try {
        execSync(`rm -r '${TEST_CACHE_DIR}'`)
      } catch (err) {
        // ignore
      }
    })

    it('should create the cache dir, if it does not already exist', function * () {
      yield microserviceCache.getCodebase('testMicrosvc', 'git@github.com:myapp/testMicrosvc')

      expect(fs.statSync(TEST_CACHE_DIR).isDirectory()).to.be.true
    })

    it('should perform a git clone if the service directory does not exist', function * () {
      fs.mkdirSync(path.join(TEST_CACHE_DIR))

      const serviceDir = yield microserviceCache.getCodebase('testMicrosvc',
        'git@github.com:myapp/testMicrosvc')

      expect(commands).to.deep.equal([
        [
          'git clone git@github.com:myapp/testMicrosvc testMicrosvc',
          '/test/resources/test-cache-dir',
        ],
      ])

      expect(serviceDir).to.equal(path.join(TEST_CACHE_DIR, 'testMicrosvc'))
    })

    it('should execute a git pull if the service directory does exist', function * () {
      fs.mkdirSync(path.join(TEST_CACHE_DIR))
      fs.mkdirSync(path.join(TEST_CACHE_DIR, 'testMicrosvc'))

      const serviceDir = yield microserviceCache.getCodebase('testMicrosvc',
        'git@github.com:myapp/testMicrosvc')

      expect(commands).to.deep.equal([
        [
          'git pull',
          '/test/resources/test-cache-dir/testMicrosvc',
        ],
      ])

      expect(serviceDir).to.equal(path.join(TEST_CACHE_DIR, 'testMicrosvc'))
    })
  })
})
