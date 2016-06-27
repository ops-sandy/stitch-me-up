'use strict'

const path = require('path')
const MicroserviceCache = require('../../../lib/microservice/cache')
const MicroserviceRegistry = require('../../../lib/microservice/registry')
const DockerComposeYmlGenerator = require('../../../lib/docker-compose/generator')

const WORKING_CACHE_DIR = path.join(__dirname, '../../resources/working-cache-dir') // TODO
const REGISTRY_SPEC = require('../../resources/working-registry.json') // TODO

describe('DockerComposeYmlGenerator', function () {
  let generator
  let registry
  beforeEach(function () {
    const cache = new MicroserviceCache(WORKING_CACHE_DIR)
    registry = new MicroserviceRegistry(REGISTRY_SPEC, cache)
    generator = new DockerComposeYmlGenerator(registry)
  })

  it('should generate a docker-compose.yml that launches all microservices in an ecosystem, if '
    + 'all services are specified in realServices', function () {
    const result = generator.generate(registry, 'testMicrosvc',
      ['feature-flags', 'service-registry', 'widget-service'])
    expect(result).to.deep.equal(require('./all-services.expected.json'))
  })

  it('should generate a docker-compose.yml that uses mocks for dependent microservices that are '
    + 'not specified in realServices', function () {
    const result = generator.generate(registry, 'testMicrosvc', ['feature-flags'])
    expect(result).to.deep.equal(require('./with-mocks.expected.json'))
  })

  it('should generate a docker-compose.yml that uses mocks for first level dependents, if no '
    + 'services specified in realServices', function () {
    const result = generator.generate(registry, 'testMicrosvc')
    expect(result).to.deep.equal(require('./with-mocks.expected.json'))
  })
})
