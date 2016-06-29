'use strict'

const co = require('co')
const exec = require('co-exec')
const program = require('commander')
const path = require('path')
const fs = require('fs')
const request = require('request-promise')
const passthru = require('passthru')
const yaml = require('js-yaml')
const npmPackage = require('../../package')
const MicroserviceCache = require('../microservice/cache')
const MicroserviceRegistry = require('../microservice/registry')
const DockerComposeYmlGenerator = require('../docker-compose/generator')

const DESCRIPTION = 'Stitch interdependent microservices together and launch them '
  + 'with docker-compose.'

class Application {
  constructor() {
    this.cwd = process.cwd()
  }

  // TODO: we should assert that the registry name == the service.yml namespace
  run(argv) {
    const self = this
    return co(function* runImpl() {
      program
        .version(npmPackage.version)
        .description(DESCRIPTION)
        .option('-w, --with <with>', 'List of real services to launch with.')
        .option('-l, --link <link>', 'List of service paths that should be launched from local codebases.')
        .option('-r, --registry <registry>', 'URI to the microservice registry JSON.')
        .option('-g, --generate', 'Only generate docker-compose.')
        .parse(argv)

      let withServices = program.with || []
      withServices = withServices instanceof Array ? withServices : [withServices]
      withServices = self.processServiceList(withServices)

      let linkServices = program.link || []
      linkServices = linkServices instanceof Array ? linkServices : [linkServices]

      const registry = program.registry || process.env.STITCH_REGISTRY
      if (!registry) {
        throw new Error('No microservice registry URI provided, use the --registry option or '
          + 'the STITCH_REGISTRY environment variable.')
      }

      yield self.stitch(registry, withServices, linkServices, !program.generate)
    })
  }

  // private
  stitch(registryUri, realServices, linkServices, launchDockerCompose) {
    const self = this
    return co(function* stitchImpl() {
      const cache = new MicroserviceCache(process.env.STITCH_CACHE_DIR) // TODO: document cache dir env var

      const registry = yield makeRegistry(cache, registryUri)
      const launchingService = registry.link('.')

      self.linkServices(registry, linkServices)

      yield self.generateDockerCompose(registry, launchingService, realServices)
      if (launchDockerCompose) {
        yield self.performServiceSetup(registry, launchingService, realServices)
        yield self.launchDockerCompose()
      }
    })
  }

  performServiceSetup(registry, launchingService, realServices) {
    const servicesToVisit = [launchingService].concat(realServices || []) // TODO: code-redundancy w/ generator.js

    return registry.visitServices(servicesToVisit, (microservice) => {
      return co(function* visitServiceImpl() {
        console.log(`Setting up ${microservice.namespace}...`)

        // TODO: this should be in another class, possibly something that encapsulates the microservice concept
        const setupSteps = microservice.setup || []
        for (let i = 0; i != setupSteps.length; ++i) {
          console.log(`  Executing command '${microservice.setup[i]}'...`)

          yield exec(microservice.setup[i])
        }
      })
    })
  }

  generateDockerCompose(registry, launchingService, realServices) {
    return co(function* generateDockerComposeImpl() {
      const generator = new DockerComposeYmlGenerator()

      let generatedDockerCompose = yield generator.generate(registry, launchingService, realServices)
      generatedDockerCompose = yaml.safeDump(generatedDockerCompose)

      const pathToDockerCompose = path.join(process.cwd(), 'docker-compose.yml')
      yield fs.writeFile.bind(fs, pathToDockerCompose, generatedDockerCompose)
    })
  }

  launchDockerCompose() {
    return new Promise((resolve, reject) => {
      passthru('docker-compose up', (err) => {
        if (err) {
          return reject(err)
        }

        return resolve()
      })
    })
  }

  linkServices(registry, links) {
    links.forEach((servicePath) => {
      const serviceName = registry.link(servicePath)

      console.log(`Linked '${serviceName}' to ${servicePath}.`)
    })
  }

  processServiceList(serviceList) {
    let result = []
    serviceList.forEach((entry) => {
      result.push.apply(result, entry.split(','))
    })
    result = result.map((entry) => entry.replace(/^\s+|\s+$/, ''))
    return result
  }
}

function makeRegistry(cache, registryUri) {
  return co(function* makeRegistryWrap() {
    let registryContents
    if (/^http/.test(registryUri)) {
      console.log(`Fetching registry contents from ${registryUri}...`)

      registryContents = yield request.get(registryUri)
    } else {
      console.log(`Reading registry file from ${registryUri}...`)

      registryContents = yield fs.readFile.bind(fs, registryUri)
    }

    registryContents = JSON.parse(registryContents)

    return new MicroserviceRegistry(registryContents, cache)
  })
}

module.exports = Application
