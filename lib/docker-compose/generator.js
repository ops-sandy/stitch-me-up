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

      // TODO: this function is too long
      yield registry.visitServices(servicesToVisit, (microservice) =>
        co(function* visitServiceImpl() {
          const publicServiceParts = (microservice.public || '').split(':')
          const publicServiceName = publicServiceParts[0]
          const publicServicePort = publicServiceParts[1]

          const privateNetwork = `${microservice.namespace}_net`

          contents.networks[privateNetwork] = {}

          // eslint-disable-next-line no-restricted-syntax
          for (const serviceName in microservice.services) {
            if (!microservice.services.hasOwnProperty(serviceName)) {
              continue
            }

            const isServicePublic = serviceName === publicServiceName

            let namespacedServiceName = `${microservice.namespace}_${serviceName}`
            // if the public service, name it after the microservice
            if (isServicePublic) {
              // TODO: service namespaces must ALWAYS be lowercase (otherwise there are DNS fails
              //       w/ networking) (need to test for this somewhere, or warn)
              namespacedServiceName = microservice.namespace.toLowerCase()
            }

            const serviceConfig = _.cloneDeep(microservice.services[serviceName])
            serviceConfig.networks = [privateNetwork]

            if (isServicePublic) {
              serviceConfig.networks.push('default')

              serviceConfig.ports = [`${currentFreePort}:${publicServicePort}`]

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

            if (serviceConfig.volumes) {
              serviceConfig.volumes = serviceConfig.volumes.map(
                makeAbsoluteVolumePair.bind(null, microservice))
            }

            contents.services[namespacedServiceName] = serviceConfig
          }
        })
      )

      return contents
    })
  }
}

function makeAbsoluteVolumePair(microservice, volPair) {
  const parts = volPair.split(':')
  let host = parts[0]

  if (isRelativePath(host)) {
    host = path.join(microservice.root, host)

    if (isRelativePath(host)) {
      host = path.join(process.cwd(), host)
    }
  }

  return `${host}:${parts[1]}`
}

function isRelativePath(p) {
  return p[0] !== '/' && p[0] !== '~'
}

module.exports = DockerComposeYmlGenerator
