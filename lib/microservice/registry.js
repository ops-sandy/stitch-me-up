'use strict'

const co = require('co')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const fsUtils = require('fs-utils')
const MicroServiceRegistryValidator = require('./registry/validator')
const MicroserviceSpecificationValidator = require('./specification-validator')

class MicroserviceRegistry {
  constructor(registryContents, cache) {
    this.cache = cache

    const validator = new MicroServiceRegistryValidator()
    validator.validate(registryContents)

    this.serviceRegistry = this.makeServiceRegistryMap(registryContents)
  }

  exists(serviceName) {
    return !! this.serviceRegistry[serviceName]
  }

  resolve(serviceName) {
    const self = this
    return co(function* resolveImpl() {
      self.throwIfUnknownService(serviceName)

      const serviceConfig = self.serviceRegistry[serviceName]
      if (!serviceConfig.spec) {
        let servicePath
        if (serviceConfig.pathOverride) {
          servicePath = serviceConfig.pathOverride
        } else {
          servicePath = yield self.cache.getCodebase(serviceName, serviceConfig.git)
        }

        const serviceYmlPath = self.getServiceYmlPath(servicePath, serviceConfig)
        serviceConfig.spec = self.getServiceYmlContents(serviceYmlPath)
      }

      return serviceConfig.spec
    })
  }

  link(toPath) {
    if (!fsUtils.isDir(toPath)) {
      throw new Error(
        `Attempting to link invalid service directory '${toPath}'.`)
    }

    const serviceYmlPath = path.join(toPath, 'service.yml')
    const serviceYmlContents = this.getServiceYmlContents(serviceYmlPath)

    this.serviceRegistry[serviceYmlContents.namespace].pathOverride = toPath
  }

  // TODO: this method merits documentation
  visitServices(servicesToVisit, visitor) {
    const queue = [].concat(servicesToVisit)

    while (queue.length > 0) {
      const serviceName = queue.shift()
      const serviceConfig = this.resolve(serviceName)

      visitor(serviceConfig)
      serviceConfig.dependents.forEach((dependentService) => {
        // if the dependent service is not one of the ones to visit, visit it's mock
        if (servicesToVisit.findIndex(dependentService) === -1) {
          const mockServiceConfig = this.resolve(`${dependentService}-mocks`)
          visitor(mockServiceConfig)
        }
      })
    }
  }

  // private
  throwIfUnknownService(serviceName) {
    if (!this.exists(serviceName)) {
      throw new Error(
        `Unknown service '${serviceName}' requested, make sure it is in the regisry.`)
    }
  }

  getServiceYmlPath(servicePath, serviceConfig) {
    let serviceYmlPath = servicePath
    if (serviceConfig.root) {
      serviceYmlPath = path.join(serviceYmlPath, serviceConfig.root)
    }
    serviceYmlPath = path.join(serviceYmlPath, 'service.yml')
    return serviceYmlPath
  }

  getServiceYmlContents(serviceYmlPath) {
    let serviceYmlContents = fs.readFileSync(serviceYmlPath)
    serviceYmlContents = yaml.safeLoad(serviceYmlContents)

    const validator = new MicroserviceSpecificationValidator()
    validator.validate(serviceYmlContents)

    return serviceYmlContents
  }

  makeServiceRegistryMap(registrySpec) {
    const result = {}

    Object.keys(registrySpec).forEach((serviceName) => {
      const serviceConfig = registrySpec[serviceName]
      result[serviceName] = serviceConfig

      const mockConfig = Object.assign({}, serviceConfig, registrySpec[serviceName].mocks)
      delete mockConfig.mocks

      const mockServiceName = `${serviceName}-mocks`
      result[mockServiceName] = mockConfig
    })

    return result
  }
}

module.exports = MicroserviceRegistry
