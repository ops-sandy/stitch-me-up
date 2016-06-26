'use strict'

const co = require('co')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
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
      if (!self.exists(serviceName)) {
        throw new Error(
          `Unknown service requested: ${serviceName}, make sure it is in the regisry.`)
      }

      const serviceConfig = self.serviceRegistry[serviceName]
      const servicePath = yield self.cache.getCodebase(serviceName, serviceConfig.git)

      const serviceYmlPath = self.getServiceYmlPath(servicePath, serviceConfig)
      return yield self.getServiceYmlContents(serviceYmlPath)
    })
  }

  link(/* serviceName, toPath */) {
    throw new Error('Unimplemented')
  }

  // private
  getServiceYmlPath(servicePath, serviceConfig) {
    let serviceYmlPath = servicePath
    if (serviceConfig.root) {
      serviceYmlPath = path.join(serviceYmlPath, serviceConfig.root)
    }
    serviceYmlPath = path.join(serviceYmlPath, 'service.yml')
    return serviceYmlPath
  }

  getServiceYmlContents(serviceYmlPath) {
    return co(function* getServiceYmlContentsImpl() {
      let serviceYmlContents = yield fs.readFile.bind(fs, serviceYmlPath)
      serviceYmlContents = yaml.safeLoad(serviceYmlContents)

      const validator = new MicroserviceSpecificationValidator()
      validator.validate(serviceYmlContents)

      return serviceYmlContents
    })
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
