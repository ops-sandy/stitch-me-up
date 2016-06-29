'use strict'

const NAMESPACE_PROPERTY_REGEX = /^[a-zA-Z_0-9-]+$/

class MicroserviceSpecificationValidator {
  constructor(registry) {
    this.registry = registry
  }

  validate(contents) {
    this.validateServicesSection(contents)
    this.validateNamespace(contents)
    this.validatePublicSection(contents)
    this.validateDependenciesSection(contents)
    this.validateSetupSection(contents)
    this.validateRoot(contents)
  }

  validateRoot(contents) {
    if (!contents.root) {
      return
    }

    if (typeof(contents.root) !== 'string') {
      this.throwInvalidSpecException('root', 'must be a string.')
    }
  }

  validateSetupSection(contents) {
    if (!contents.setup) {
      return
    }

    if (!(contents.setup instanceof Array)) {
      this.throwInvalidSpecException('setup', 'must be an array.')
    }

    contents.setup.forEach((cmd, index) => {
      if (typeof(cmd) !== 'string') {
        this.throwInvalidSpecException('setup', `contains invalid entry at index ${index}.`)
      }
    })
  }

  validateDependenciesSection(contents) {
    if (!contents.dependencies) {
      return
    }

    if (!(contents.dependencies instanceof Array)) {
      this.throwInvalidSpecException('dependencies', 'must be an array.')
    }

    contents.dependencies.forEach((microserviceName, index) => {
      if (typeof(microserviceName) !== 'string') {
        this.throwInvalidSpecException('dependencies', `contains invalid entry at index ${index}.`)
      }

      if (!this.registry.exists(microserviceName)) {
        this.throwInvalidSpecException('dependencies',
          `has unknown microservice '${microserviceName}', make sure it is in the registry.`)
      }
    })
  }

  validateServicesSection(contents) {
    if (!contents.services) {
      this.throwInvalidSpecException('services', 'must exist.')
    }

    if (contents.services.constructor !== Object) {
      this.throwInvalidSpecException('services', 'must be an object.')
    }

    if (!Object.keys(contents.services).length) {
      this.throwInvalidSpecException('services', 'must expose at least one container.')
    }
  }

  validatePublicSection(contents) {
    if (!contents.public) {
      this.throwInvalidSpecException('public', 'must exist.')
    }

    if (!(contents.public instanceof Array)) {
      this.throwInvalidSpecException('public', 'must be an array')
    }

    if (!contents.public.length) {
      this.throwInvalidSpecException('public', 'must expose at least one public container.')
    }

    contents.public.forEach((serviceName) => {
      const parts = serviceName.split(':')
      if (!contents.services[parts[0]]) {
        this.throwInvalidSpecException('public', `exposes unknown service '${parts[0]}'.`)
      }

      // TODO: need tests for the following code + need to check if it is an int
      if (!parts[1]) {
        this.throwInvalidSpecException('public',
          `does not specify port to expose for service ${parts[0]}.`)
      }
    })
  }

  validateNamespace(contents) {
    if (!contents.namespace) {
      this.throwInvalidSpecException('namespace', 'must exist.')
    }

    if (typeof(contents.namespace) !== 'string') {
      this.throwInvalidSpecException('namespace', 'must be a string.')
    }

    if (!NAMESPACE_PROPERTY_REGEX.test(contents.namespace)) {
      this.throwInvalidSpecException('namespace', `must match regex '${NAMESPACE_PROPERTY_REGEX}'.`)
    }
  }

  throwInvalidSpecException(propertyName, error) {
    throw new Error(`Invalid microservice spec: '${propertyName}' property ${error}`)
  }
}

module.exports = MicroserviceSpecificationValidator
