'use strict'

const MicroServiceRegistryValidator = require('./registry/validator')

class MicroserviceRegistry {
  constructor(registryContents) {
    this.registryContents = registryContents

    const validator = new MicroServiceRegistryValidator()
    validator.validate()
  }

  exists(serviceName) {
    return !! this.registryContents[serviceName]
  }

  resolve(serviceName) {
    throw new Error(`unimplemented ${serviceName}`)
  }
}

module.exports = MicroserviceRegistry
