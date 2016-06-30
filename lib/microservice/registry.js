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

    const validator = new MicroServiceRegistryValidator(this)
    validator.validate(registryContents)

    this.serviceRegistry = this.makeServiceRegistryMap(registryContents)
  }

  exists(serviceName) {
    return !! this.serviceRegistry[serviceName]
  }

  resolve(requestedServiceName, realServices) {
    const self = this
    return co(function* resolveImpl() {
      // if the dependent service is not one of the ones to visit, visit it's mock
      let serviceName = requestedServiceName
      if (realServices.indexOf(serviceName) === -1) {
        serviceName = `${serviceName}-mocks`
      }

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
        serviceConfig.spec.path = servicePath
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
    const serviceName = serviceYmlContents.namespace

    if (!this.exists(serviceName)) {
      throw new Error(
        `Unknown service \'${serviceName}\' requested, make sure it is in the registry.`)
    }

    this.serviceRegistry[serviceName].pathOverride = toPath
    delete this.serviceRegistry[serviceName].spec

    return serviceName
  }

  // TODO: this method merits documentation
  visitServices(servicesToVisit, visitor) {
    const self = this
    return co(function* visitServicesImpl() {
      const queue = [].concat(servicesToVisit)
      const visited = {}

      while (queue.length > 0) {
        const serviceName = queue.shift()
        const serviceConfig = yield self.resolve(serviceName, servicesToVisit)

        if (!visited[serviceName]) {
          visited[serviceName] = true
          yield Promise.resolve(visitor(serviceConfig, serviceName))
        }

        const dependents = serviceConfig.dependents || []
        queue.push.apply(queue, dependents)
      }
    })
  }

  // private
  throwIfUnknownService(serviceName) {
    if (!this.exists(serviceName)) {
      throw new Error(
        `Unknown service '${serviceName}' requested, make sure it is in the registry.`)
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

    const validator = new MicroserviceSpecificationValidator(this)
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
