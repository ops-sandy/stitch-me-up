'use strict'

const path = require('path')
const _ = require('lodash')
const co = require('co')

class DockerComposeYmlGenerator {
  generate(registry, launchingService, realServices) {
    let currentFreePort = 3000 // TODO: would be better to be able to customize what ports to use
    const contents = {
      version: '2',
      services: {},
      networks: {},
    }

    return co(function* generateImpl() {
      const servicesToVisit = [launchingService].concat(realServices || [])

      yield registry.visitServices(servicesToVisit, (microservice) => { // TODO: this function is too long
        return co(function* visitServiceImpl() {
          const publicServicePorts = processPublicServices(microservice)
          const privateNetwork = `${microservice.namespace}_net`

          contents.networks[privateNetwork] = {}

          for (let serviceName in microservice.services) {
            if (!microservice.services.hasOwnProperty(serviceName)) {
              continue
            }

            let namespacedServiceName = `${microservice.namespace}_${serviceName}`
            if (publicServicePorts[serviceName]) { // if the public service, name it after the microservice
              // TODO: service namespaces must ALWAYS be lowercase (otherwise there are DNS fails w/ networking)
              //       (need to test for this somewhere, or warn)
              namespacedServiceName = microservice.namespace.toLowerCase()
            }

            const serviceConfig = _.cloneDeep(microservice.services[serviceName])
            serviceConfig.networks = [privateNetwork]

            if (publicServicePorts[serviceName]) {
              serviceConfig.networks.push('default')

              const port = publicServicePorts[serviceName]
              serviceConfig.ports = [`${currentFreePort}:${port}`]

              // NOTE: this console.log is important for functional tests, w/o it, we can't tell
              // where a private service is launched to during the test.
              console.log(`Launching ${microservice.namespace} at http://localhost:${currentFreePort}`)

              ++currentFreePort
            }

            if (serviceConfig.depends_on) {
              serviceConfig.links = serviceConfig.depends_on.map(
                (dependent) => `${microservice.namespace}_${dependent}:${dependent}`)

              serviceConfig.depends_on = serviceConfig.depends_on.map(
                (dependent) => `${microservice.namespace}_${dependent}`)
            }

            // TODO: should only allow ONE public service, so it shouldn't be an array

            if (serviceConfig.volumes) {
              serviceConfig.volumes = serviceConfig.volumes.map(
                makeAbsoluteVolumePair.bind(null, microservice))
            }

            contents.services[namespacedServiceName] = serviceConfig
          }
        })
      })

      return contents
    })
  }
}

function makeAbsoluteVolumePair(microservice, volPair) {
  const parts = volPair.split(':')
  let host = parts[0]

  if (host.substring(0, 1) !== '/') {
    host = path.join(microservice.path, host)
  }

  if (host.substring(0, 1) !== '/') {
    host = path.join(process.cwd(), host)
  }

  return `${host}:${parts[1]}`
}

function processPublicServices(microserviceConfig) {
  const result = {}
  const publicServices = microserviceConfig.public || []
  publicServices.forEach((entry) => {
    const pair = entry.split(':')
    result[pair[0]] = [pair[1]] // mapping service name => port TODO: validate this format
  })
  return result
}

module.exports = DockerComposeYmlGenerator
