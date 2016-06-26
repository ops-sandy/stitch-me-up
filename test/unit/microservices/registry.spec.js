'use strict'

const path = require('path')
const mockRequire = require('mock-require')
const expect = require('chai').expect
const MicroserviceRegistry = require('../../../lib/microservice/registry')

const TEST_CACHE_DIR = path.join(__dirname, '../../resources/cache-dir')
const REGISTRY_SPEC = require('../../resources/registry')
const EXPECTED_REGISTRY_MAP = require('../../resources/expected-registry-map')

const EXPECTED_SERVICE_YML = {
  namespace: 'ns',
  public: [
    'web',
  ],
  services: {
    web: {
      command: [
        'npm',
        'start',
      ],
      image: 'node:4',
      ports: [
        '1337:1337',
      ],
      volumes: [
        '.:/app',
      ],
      working_dir: '/app',
    },
  },
}

describe('MicroserviceRegistry', function () {
  before(function () {
    mockRequire('co-exec', function* () {
      // empty
    })
  })

  after(function () {
    mockRequire.stopAll()
  })

  let MicroserviceCache
  let registry
  beforeEach(function () {
    MicroserviceCache = mockRequire.reRequire('../../../lib/microservice/cache')
    registry = new MicroserviceRegistry(REGISTRY_SPEC, new MicroserviceCache(TEST_CACHE_DIR))
  })

  describe('#constructor()', function () {
    it('should throw if the registryContents are invalid', function () {
      expect(() => new MicroserviceRegistry({ a: 45 }, new MicroserviceCache(TEST_CACHE_DIR)))
        .to.throw(Error, /^Invalid microservice registry/)
    })

    it('should set mock services in the registryContents correctly', function () {
      expect(registry.serviceRegistry).to.deep.equal(EXPECTED_REGISTRY_MAP)
    })
  })

  describe('#exists()', function () {
    it('should return true if the service is in the registry', function () {
      expect(registry.exists('testMicrosvc')).to.be.true
    })

    it('should return false if the service is not in the registry', function () {
      expect(registry.exists('sdlfkjsdf')).to.be.false
    })
  })

  describe('#resolve()', function () {
    it('should load a service\'s YML file after cloning/pulling', function * () {
      const contents = yield registry.resolve('testMicrosvc')
      expect(contents).to.deep.equal(EXPECTED_SERVICE_YML)
    })

    it('should fail to load the service YML if the YML is an invalid service spec', function * () {
      let error
      try {
        yield registry.resolve('feature-flags')
      } catch (e) {
        error = e
      }

      expect(error).to.be.instanceof(Error)
      expect(error.message).to.match(/^Invalid microservice spec/)
    })

    it('should load mock services correctly', function * () {
      const testMicrosvcMock = yield registry.resolve('testMicrosvc-mocks')
      expect(testMicrosvcMock).to.deep.equal(EXPECTED_SERVICE_YML)

      const featureFlagsMock = yield registry.resolve('feature-flags-mocks')
      expect(featureFlagsMock).to.deep.equal(EXPECTED_SERVICE_YML)
    })
  })
})
