'use strict'

const co = require('co')
const path = require('path')
const fs = require('fs')
const request = require('request-promise')
const passthru = require('passthru')
const yaml = require('js-yaml')
const minimist = require('minimist')
const MicroserviceCache = require('../microservice/cache')
const MicroserviceRegistry = require('../microservice/registry')
const DockerComposeYmlGenerator = require('../docker-compose/generator')

const DESCRIPTION = 'Stitch interdependent microservices together and launch them '
  + 'with docker-compose.'

class Application {
  constructor() {
    this.cwd = process.cwd()
  }

  help() {
    console.log('Usage: stitch --with=...services... --link=path/to/checkout')
    console.log()
    console.log(`    ${DESCRIPTION}`)
    console.log()
    console.log('Options:')
    console.log()
    console.log('-w, --with <with...>', 'List of real services to launch with.')
    console.log('-l, --link <link...>',
      'List of service paths that should be launched from local codebases.')
    console.log('-r, --registry [registry]', 'URI to the microservice registry JSON.')
    console.log('-g, --generate', 'Only generate docker-compose.')
  }

  // TODO: we should assert that the registry name == the service.yml namespace
  run(argv) {
    const self = this
    return co(function* runImpl() {
      const parsedArgv = minimist(argv) // TODO: should probably validate parsed args

      if (parsedArgv.help) {
        self.help()
        return
      }

      let withServices = parsedArgv.with || []
      withServices = withServices instanceof Array ? withServices : [withServices]
      withServices = self.processServiceList(withServices)

      let linkServices = parsedArgv.link || []
      linkServices = linkServices instanceof Array ? linkServices : [linkServices]

      const registry = parsedArgv.registry || process.env.STITCH_REGISTRY
      if (!registry) {
        throw new Error('No microservice registry URI provided, use the --registry option or '
          + 'the STITCH_REGISTRY environment variable.')
      }

      yield self.stitch(registry, withServices, linkServices, !parsedArgv.generate)
    })
  }

  // private
  stitch(registryUri, withServices, linkServices, launchDockerCompose) {
    const self = this
    return co(function* stitchImpl() {
      // TODO: document the cache dir env var
      const cache = new MicroserviceCache(process.env.STITCH_CACHE_DIR)

      const registry = yield makeRegistry(cache, registryUri)
      const launchingService = registry.link('.')

      const linkedServices = self.linkServices(registry, linkServices)
      const realServices = withServices.concat(linkedServices)

      yield self.generateDockerCompose(registry, launchingService, realServices)
      if (launchDockerCompose) {
        yield self.performServiceSetup(registry, launchingService, realServices)
        yield self.launchDockerCompose()
      }
    })
  }

  performServiceSetup(registry, launchingService, realServices) {
    // TODO: code-redundancy w/ generator.js
    const servicesToVisit = [launchingService].concat(realServices || [])

    return registry.visitServices(servicesToVisit, (microservice) =>
      co(function* visitServiceImpl() {
        console.log(`Setting up ${microservice.namespace}...`)

        // TODO: this should be in another class, possibly something that
        // encapsulates the microservice concept
        const setupSteps = microservice.setup || []
        for (let i = 0; i !== setupSteps.length; ++i) {
          console.log(`  Executing command '${microservice.setup[i]}'...\n`)

          // TODO: must escape setup command
          yield passthruPromise(`bash -c '${microservice.setup[i]}'`, { cwd: microservice.root })
        }
      })
    )
  }

  generateDockerCompose(registry, launchingService, realServices) {
    return co(function* generateDockerComposeImpl() {
      const generator = new DockerComposeYmlGenerator()

      let generatedDockerCompose = yield generator.generate(
        registry, launchingService, realServices)
      generatedDockerCompose = yaml.safeDump(generatedDockerCompose)

      const pathToDockerCompose = path.join(process.cwd(), 'docker-compose.yml')
      yield fs.writeFile.bind(fs, pathToDockerCompose, generatedDockerCompose)
    })
  }

  launchDockerCompose() {
    return passthruPromise('docker-compose up')
  }

  linkServices(registry, links) {
    const result = []
    links.forEach((servicePath) => {
      const serviceName = registry.link(servicePath)
      result.push(serviceName)

      console.log(`Linked '${serviceName}' to ${servicePath}.`)
    })
    return result
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

function passthruPromise(cmd, options) {
  return new Promise((resolve, reject) => {
    passthru(cmd, options || {}, (err) => {
      if (err) {
        return reject(err)
      }

      return resolve()
    })
  })
}

module.exports = Application
