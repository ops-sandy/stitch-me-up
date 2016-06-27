'use strict'

const _ = require('lodash')
const co = require('co')

const INITIAL_COMPOSE_CONTENTS = {
  version: '2',
  services: {},
  networks: {},
}

// TODO: we need to handle setup steps somehow... before launching?
class DockerComposeYmlGenerator {
  generate(registry, launchingService, realServices) {
    const contents = Object.assign({}, INITIAL_COMPOSE_CONTENTS)

    return co(function* generateImpl() {
      const servicesToVisit = [launchingService].concat(realServices || [])

      yield registry.visitServices(servicesToVisit, (microservice) => {
        const privateNetwork = `${microservice.namespace}_net`

        contents.networks[privateNetwork] = {}

        Object.keys(microservice.services).forEach((serviceName) => {
          const namespacedServiceName = `${microservice.namespace}_${serviceName}`
          const serviceConfig = _.cloneDeep(microservice.services[serviceName])

          serviceConfig.networks = ['default', privateNetwork]

          if (serviceConfig.depends_on) {
            serviceConfig.links = serviceConfig.depends_on.map(
              (dependent) => `${microservice.namespace}_${dependent}:${dependent}`)

            serviceConfig.depends_on = serviceConfig.depends_on.map(
              (dependent) => `${microservice.namespace}_${dependent}`)
          }

          contents.services[namespacedServiceName] = serviceConfig
        })
      })

      return contents
    })
  }
}

module.exports = DockerComposeYmlGenerator
