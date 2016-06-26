'use strict'

const isValidUrl = require('valid-url').isUri

class MicroServiceRegistryValidator {
  validate(contents) {
    if (contents.constructor !== Object) {
      throw new Error('Invalid microservice registry: registy must be an object.')
    }

    Object.keys(contents).forEach((serviceSpecName) => {
      this.validateServiceSpec(serviceSpecName, contents[serviceSpecName])
    })
  }

  validateServiceSpec(serviceSpecName, serviceSpec) {
    if (!serviceSpec.git) {
      this.throwInvalidServiceSpecError(serviceSpecName, 'must contain root \'git\' property.')
    }

    if (!serviceSpec.mocks) {
      this.throwInvalidServiceSpecError(serviceSpecName, 'must contain \'mocks\' property.')
    }

    if (!serviceSpec.mocks.root && !serviceSpec.mocks.git) {
      this.throwInvalidServiceSpecError(serviceSpecName,
        'must contain \'mocks\' property with \'git\' or \'root\' properties.')
    }

    if (!serviceSpec.environments) {
      return
    }

    if (serviceSpec.environments.constructor !== Object) {
      this.throwInvalidServiceSpecError(serviceSpecName,
        'has invalid \'endpoints\' property; it must be an object.')
    }

    Object.keys(serviceSpec.environments).forEach((endpointConfigName) => {
      const endpointConfig = serviceSpec.environments[endpointConfigName]

      if (typeof(endpointConfig) !== 'string') {
        this.throwInvalidServiceSpecError(serviceSpecName,
          `has invalid 'endpoints' entry; ${endpointConfigName} must be a string.`)
      }

      if (!isValidUrl(endpointConfig)) {
        this.throwInvalidServiceSpecError(serviceSpecName,
          `has invalid 'endpoints' entry; ${endpointConfigName} must be a URL.`)
      }
    })
  }

  throwInvalidServiceSpecError(sectionName, message) {
    throw new Error(`Invalid microservice registry: section '${sectionName}' ${message}'`)
  }
}

module.exports = MicroServiceRegistryValidator
