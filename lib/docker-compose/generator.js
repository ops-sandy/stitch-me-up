'use strict'

const path = require('path')
const _ = require('lodash')
const co = require('co')

// TODO: we need to handle setup steps somehow... before launching?
class DockerComposeYmlGenerator {
  generate(registry, launchingService, realServices) {
    const contents = {
      version: '2',
      services: {},
      networks: {},
    }

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

          if (serviceConfig.volumes) {
            serviceConfig.volumes = serviceConfig.volumes.map((volPair) => {
              const parts = volPair.split(':')
              let host = parts[0]

              if (host.substring(0, 1) !== '/') {
                host = path.join(microservice.path, host)
              }

              if (host.substring(0, 1) !== '/') {
                host = path.join(process.cwd(), host)
              }

              return `${host}:${parts[1]}`
            })
          }

          contents.services[namespacedServiceName] = serviceConfig
        })
      })

      return contents
    })
  }
}

module.exports = DockerComposeYmlGenerator
