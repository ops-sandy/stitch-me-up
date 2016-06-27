'use strict'

const path = require('path')
const mockRequire = require('mock-require')
const expect = require('chai').expect
const MicroserviceRegistry = require('../../../lib/microservice/registry')

const TEST_CACHE_DIR = path.join(__dirname, '../../resources/cache-dir')
const WORKING_CACHE_DIR = path.join(__dirname, '../../resources/working-cache-dir')
const REGISTRY_SPEC = require('../../resources/registry')
const WORKING_REGISTRY_SPEC = require('../../resources/working-registry')
const EXPECTED_REGISTRY_MAP = require('../../resources/expected-registry-map')

const ENTITLEMENTS_OVERRIDE_PATH = path.join(__dirname, '../../resources/testMicrosvc-override')
const NOTASERVICE_SERVICE_PATH = path.join(__dirname, '../../resources/notaservice')
const PROJECT_ROOT_DIR = path.join(__dirname, '../../../')

const EXPECTED_SERVICE_YML = {
  namespace: 'ns',
  public: [
    'web',
  ],
  path: 'test/resources/cache-dir/feature-flags',
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

const EXPECTED_ENT_SERVICE_YML = Object.assign({}, EXPECTED_SERVICE_YML, {
  path: 'test/resources/cache-dir/testMicrosvc',
  dependents: [
    'feature-flags',
  ],
})

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
      contents.path = cleanPath(contents.path)

      expect(contents).to.deep.equal(EXPECTED_ENT_SERVICE_YML)
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
      testMicrosvcMock.path = cleanPath(testMicrosvcMock.path)

      expect(testMicrosvcMock).to.deep.equal(EXPECTED_ENT_SERVICE_YML)

      const featureFlagsMock = yield registry.resolve('feature-flags-mocks')
      featureFlagsMock.path = cleanPath(featureFlagsMock.path)

      expect(featureFlagsMock).to.deep.equal(Object.assign({}, EXPECTED_SERVICE_YML, {
        path: 'test/resources/cache-dir/feature-flags-mocks',
        namespace: 'ff',
      }))
    })

    it('should use the override path if a directory is linked', function * () {
      registry.link(ENTITLEMENTS_OVERRIDE_PATH)

      const testMicrosvc = yield registry.resolve('testMicrosvc')
      testMicrosvc.path = cleanPath(testMicrosvc.path)

      expect(testMicrosvc).to.deep.equal(Object.assign({}, EXPECTED_ENT_SERVICE_YML, {
        namespace: 'testMicrosvc',
        path: 'test/resources/testMicrosvc-override',
        dependents: [
          'feature-flags',
          'service-registry',
        ],
      }))
    })
  })

  describe('#link()', function () {
    it('should throw if the requested service does not exist', function () {
      expect(() => registry.link(NOTASERVICE_SERVICE_PATH)).to.throw(Error,
        'Unknown service \'notaservice\' requested, make sure it is in the registry.')
    })

    it('should throw if the path to link to does not exist', function () {
      expect(() => registry.link('/path/to/nowhere')).to.throw(Error,
        'Attempting to link invalid service directory \'/path/to/nowhere\'.')
    })

    it('should set the override path for the given service', function () {
      registry.link(ENTITLEMENTS_OVERRIDE_PATH)
      expect(registry.serviceRegistry.testMicrosvc.pathOverride).to.equal(ENTITLEMENTS_OVERRIDE_PATH)
    })
  })

  describe('#visitServices()', function () {
    let realRegistry
    beforeEach(function () {
      realRegistry = new MicroserviceRegistry(WORKING_REGISTRY_SPEC, new MicroserviceCache(WORKING_CACHE_DIR))
    })

    it('should pass each "service to visit"\'s service config to the visitor', function * () {
      const visited = []
      yield realRegistry.visitServices(['testMicrosvc', 'feature-flags', 'service-registry'],
        (serviceConfig, serviceName) => {
          visited.push([serviceConfig.namespace, serviceName])
        }
      )

      expect(visited).to.deep.equal([
        ['testMicrosvc', 'testMicrosvc'],
        ['feature-flags', 'feature-flags'],
        ['service-registry', 'service-registry'],
      ])
    })

    it('should pass mocks for dependent services that are not listed in the "services to visit list"', function * () {
      const visited = []
      yield realRegistry.visitServices(['testMicrosvc'], (serviceConfig, serviceName) => {
        visited.push([serviceConfig.namespace, serviceName])
      })

      expect(visited).to.deep.equal([
        ['testMicrosvc', 'testMicrosvc'],
        ['feature-flags', 'feature-flags-mocks'],
        ['service-registry', 'service-registry-mocks'],
      ])
    })
  })
})

function cleanPath(pathToClean) {
  return pathToClean.replace(PROJECT_ROOT_DIR, '')
}
