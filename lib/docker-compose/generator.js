'use strict'

const _ = require('lodash')

const INITIAL_COMPOSE_CONTENTS = {
  version: '2',
  services: {},
  networks: {},
}

// TODO: we need to handle setup steps somehow... before launching?
class DockerComposeYmlGenerator {
  generate(registry, launchingService, realServices) {
    const contents = Object.assign({}, INITIAL_COMPOSE_CONTENTS)

    registry.visitServices([launchingService].concat(realServices), (microservice) => {
      const privateNetwork = `${microservice.namespace}_net`

      contents.networks[privateNetwork] = {}

      const serviceComposeConfig = {}
      Object.keys(microservice.services).forEach((serviceName) => {
        serviceComposeConfig[`${microservice.namespace}_${serviceName}`]
          = _.cloneDeep(microservice.services[serviceName])
      })

      serviceComposeConfig.networks = ['default', privateNetwork]
      serviceComposeConfig.links = serviceComposeConfig.depends_on.map((dependent) => {
        return `${microservice.namespace}_${dependent}:${dependent}`
      })
      serviceComposeConfig.depends_on = serviceComposeConfig.depends_on.map((dependent) => {
        return `${microservice.namespace}_${dependent}`
      })
    })

    return contents
  }
}

module.exports = DockerComposeYmlGenerator
