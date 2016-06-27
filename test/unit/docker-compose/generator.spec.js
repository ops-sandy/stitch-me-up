'use strict'

const path = require('path')
const expect = require('chai').expect
const mockRequire = require('mock-require')
const MicroserviceRegistry = require('../../../lib/microservice/registry')
const DockerComposeYmlGenerator = require('../../../lib/docker-compose/generator')

const WORKING_CACHE_DIR = path.join(__dirname, '../../resources/working-cache-dir')
const REGISTRY_SPEC = require('../../resources/working-registry.json')
const PROJECT_ROOT_DIR = path.join(__dirname, '../../../')

describe('DockerComposeYmlGenerator', function () {
  // lots of code redundancy w/ this
  before(function () {
    mockRequire('co-exec', function* () {
      // empty
    })
  })

  after(function () {
    mockRequire.stopAll()
  })

  let MicroserviceCache
  let generator
  let registry
  beforeEach(function () {
    MicroserviceCache = mockRequire.reRequire('../../../lib/microservice/cache')

    const cache = new MicroserviceCache(WORKING_CACHE_DIR)
    registry = new MicroserviceRegistry(REGISTRY_SPEC, cache)
    generator = new DockerComposeYmlGenerator(registry)
  })

  it('should generate a docker-compose.yml that launches all microservices in an ecosystem, if '
    + 'all services are specified in realServices', function * () {
    const result = yield generator.generate(registry, 'testMicrosvc',
      ['feature-flags', 'service-registry', 'widget-service'])
    normalizeDockerCompose(result)

    expect(result).to.deep.equal(require('./expected-docker-compose/all-services.json'))
  })

  it('should generate a docker-compose.yml that uses mocks for dependent microservices that are '
    + 'not specified in realServices', function * () {
    const result = yield generator.generate(registry, 'testMicrosvc', ['feature-flags'])
    normalizeDockerCompose(result)

    expect(result).to.deep.equal(require('./expected-docker-compose/with-mocks.json'))
  })

  it('should generate a docker-compose.yml that uses mocks for first level dependents, if no '
    + 'services specified in realServices', function * () {
    const result = yield generator.generate(registry, 'testMicrosvc')
    normalizeDockerCompose(result)

    expect(result).to.deep.equal(require('./expected-docker-compose/with-no-real.json'))
  })

  function normalizeDockerCompose(compose) {
    Object.keys(compose.services).forEach((serviceName) => {
      const service = compose.services[serviceName]
      if (service.volumes) {
        service.volumes = service.volumes.map((p) => cleanPath(p))
      }
    })
  }
})

function cleanPath(pathToClean) {
  return pathToClean.replace(PROJECT_ROOT_DIR, '')
}
