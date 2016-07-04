'use strict'

const isValidUrl = require('valid-url').isUri

class MicroServiceRegistryValidator {
  validate(contents) {
    if (contents.constructor !== Object) {
      throw new Error('Invalid microservice registry: registry must be an object.')
    }

    Object.keys(contents).forEach((serviceSpecName) => {
      this.validateServiceSpec(serviceSpecName, contents[serviceSpecName])
    })
  }

  validateServiceSpec(serviceSpecName, serviceSpec) {
    if (/-mocks$/.test(serviceSpecName)) {
      this.throwInvalidServiceSpecError(serviceSpecName,
        'cannot have name that ends with \'-mocks\', this suffix is reserved.')
    }

    if (typeof(serviceSpec) !== 'object') {
      this.throwInvalidServiceSpecError(serviceSpecName, 'must be an object')
    }

    if (serviceSpec.mocks) {
      this.validateMocksSection(serviceSpecName, serviceSpec.mocks)
    }

    if (serviceSpec.environments) {
      this.validateEnvironmentsSection(serviceSpecName, serviceSpec.environments)
    }
  }

  validateEnvironmentsSection(serviceSpecName, environments) {
    if (environments.constructor !== Object) {
      this.throwInvalidServiceSpecError(serviceSpecName,
        'has invalid \'endpoints\' property; it must be an object.')
    }

    Object.keys(environments).forEach((endpointConfigName) => {
      const endpointConfig = environments[endpointConfigName]

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

  validateMocksSection(serviceSpecName, mocks) {
    if (!mocks.root && !mocks.git) {
      this.throwInvalidServiceSpecError(serviceSpecName,
        'must contain \'mocks\' property with \'git\' or \'root\' properties.')
    }
  }

  throwInvalidServiceSpecError(sectionName, message) {
    throw new Error(`Invalid microservice registry: section '${sectionName}' ${message}'`)
  }
}

module.exports = MicroServiceRegistryValidator
