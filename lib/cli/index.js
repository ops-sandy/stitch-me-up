'use strict'

const co = require('co')
const program = require('commander')
const path = require('path')
const fs = require('fs')
const request = require('request-promise')
const passthru = require('passthru')
const npmPackage = require('../../package')
const MicroserviceCache = require('../microservice/cache')
const MicroserviceRegistry = require('../microservice/registry')
const DockerComposeYmlGenerator = require('../docker-compose/generator')

const DESCRIPTION = 'Stitch interdependent microservices together and launch them '
  + 'with docker-compose.'

class Application {
  constructor() {
    this.cwd = process.cwd()

    this.config = {}

    try {
      // eslint-disable-next-line global-require
      this.config = require(path.join(this.cwd, '.stitch.js'))
    } catch (err) {
      // ignore
    }
  }

  run(argv) {
    program
      .version(npmPackage.version)
      .description(DESCRIPTION)
      .option('-w, --with', 'List of real services to launch with.')
      .option('-l, --link', 'List of service/path pairs for services that are checked out locally.')
      .option('-r, --registry', 'URI to the microservice registry JSON.')
      .parse(argv)

    let withServices = program.with || []
    withServices = withServices instanceof Array ? withServices : [withServices]

    let linkServices = program.link || []
    linkServices = linkServices instanceof Array ? linkServices : [linkServices]

    const registry = program.registry || self.config.registry
    return this.stitch(registry, withServices, linkServices)
  }

  stitch(registryUri, realServices, linkServices) {
    const self = this
    return co.wrap(function* stitchImpl() {
      const cache = new MicroserviceCache(self.config.cache)
      const registry = yield makeRegistry(cache, registryUri)

      self.linkServices(registry, linkServices)

      yield self.generateDockerCompose(registry, realServices)
      yield self.launchDockerCompose()
    })
  }

  generateDockerCompose(registry, realServices) {
    const generator = new DockerComposeYmlGenerator()
    return generator.generate(registry, realServices)
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
    links.forEach((pair) => {
      const parts = pair.split('=')
      const serviceName = parts[0]
      const servicePath = parts[1]

      if (!registry.exists(serviceName)) {
        throw new Error(`Invalid link: unknown service '${serviceName}'.`)
      }

      if (!dirExists(servicePath)) {
        throw new Error(`Invalid link: unknown directory path '${servicePath}'.`)
      }

      console.log(`Linking '${serviceName}' to ${servicePath}.`)

      registry.link(serviceName, servicePath)
    })
  }
}

function dirExists(servicePath) {
  try {
    return fs.statSync(servicePath).isDirectory()
  } catch (err) {
    return false
  }
}

function makeRegistry(cache, registryUri) {
  return co.wrap(function* makeRegistryWrap() {
    let registryContents
    if (/^http/.test(registryContents)) {
      registryContents = yield request.get(registryUri)
    } else {
      registryContents = yield fs.readFile(registryUri)
    }

    return new MicroserviceRegistry(registryContents, cache)
  })
}

module.exports = Application
