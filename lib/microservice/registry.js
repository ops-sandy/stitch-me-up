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

  resolve(requestedService, realServicesToUse) {
    const realServices = realServicesToUse || []

    // TODO: need a service reference concept/class
    const parts = requestedService.split('#')
    const requestedServiceName = parts[0]
    const branchOverride = parts[1]

    const self = this
    return co(function* resolveImpl() {
      // if the dependent service is not one of the ones to visit, visit it's mock
      let serviceName = requestedServiceName
      if (realServices.indexOf(serviceName) === -1) {
        serviceName = `${serviceName}-mocks`

        console.log(`Resolving ${requestedServiceName} service to mocks.`)
      }

      self.throwIfUnknownService(serviceName)

      const serviceConfig = self.serviceRegistry[serviceName]
      if (!serviceConfig.spec) { // TODO: spec cache should be seprate member
        let servicePath
        if (serviceConfig.pathOverride) {
          servicePath = serviceConfig.pathOverride
        } else {
          if (!serviceConfig.git) {
            throw new Error(`Service '${serviceName}' has no git repo in the registry.`)
          }

          servicePath = yield self.cache.getCodebase(
            serviceName, serviceConfig.git, branchOverride || serviceConfig.branch)
        }

        const serviceYmlPath = self.getServiceYmlPath(servicePath, serviceConfig)
        serviceConfig.spec = self.getServiceYmlContents(serviceYmlPath)
        serviceConfig.spec.path = servicePath // TODO rename to repoPath
        serviceConfig.spec.root = path.dirname(serviceYmlPath)
      }

      return serviceConfig.spec
    })
  }

  link(toPath) {
    if (!fsUtils.isDir(toPath)) {
      throw new Error(
        `Attempting to link invalid service directory '${toPath}'.`)
    }

    const serviceYmlPath = this.getServiceSpecFilePath(toPath)
    const serviceYmlContents = this.getServiceYmlContents(serviceYmlPath)
    const serviceName = serviceYmlContents.namespace

    this.throwIfUnknownService(serviceName)

    this.serviceRegistry[serviceName].pathOverride = toPath
    delete this.serviceRegistry[serviceName].spec

    return serviceName
  }

  // TODO: this method merits documentation
  visitServices(servicesToVisit, visitor) {
    const realServiceNames = servicesToVisit.map((entry) => entry.split('#')[0])

    const self = this
    return co(function* visitServicesImpl() {
      const queue = [].concat(servicesToVisit)
      const visited = {}

      while (queue.length > 0) {
        const serviceRef = queue.shift()
        const serviceName = serviceRef.split('#')[0]
        if (visited[serviceName]) {
          continue
        }

        visited[serviceName] = true

        const serviceConfig = yield self.resolve(serviceRef, realServiceNames)

        yield Promise.resolve(visitor(serviceConfig, serviceName))

        const dependents = serviceConfig.dependencies || []
        queue.push.apply(queue, dependents)
      }
    })
  }

  // private
  throwIfUnknownService(serviceName) {
    if (this.exists(serviceName)) {
      return
    }

    if (/-mocks$/.test(serviceName)) {
      const realServiceName = serviceName.substring(0, serviceName.length - 6)
      throw new Error(`Cannot find mocks for service '${realServiceName}', make sure the service `
        + 'has a mocks section in the registry.')
    }

    throw new Error(
      `Unknown service '${serviceName}' requested, make sure it is in the registry.`)
  }

  getServiceYmlPath(servicePath, serviceConfig) {
    let rootPath = servicePath
    if (serviceConfig.root) {
      rootPath = path.join(rootPath, serviceConfig.root)
    }
    return this.getServiceSpecFilePath(rootPath)
  }

  getServiceSpecFilePath(serviceDir) {
    const serviceYmlPath = path.join(serviceDir, 'service.yml')
    if (fsUtils.isFile(serviceYmlPath)) {
      return serviceYmlPath
    }

    return path.join(serviceDir, 'stitch.yml')
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
      const serviceConfig = Object.assign({ branch: 'master' }, registrySpec[serviceName])
      result[serviceName] = serviceConfig

      if (serviceConfig.mocks) {
        const mockConfig = Object.assign({}, serviceConfig)
        delete mockConfig.mocks
        delete mockConfig.spec
        delete mockConfig.environments // TODO: should probably have a whitelist for properties
        Object.assign(mockConfig, serviceConfig.mocks)

        const mockServiceName = `${serviceName}-mocks`
        result[mockServiceName] = mockConfig
      }
    })

    return result
  }
}

module.exports = MicroserviceRegistry
