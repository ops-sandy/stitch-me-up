'use strict'

const MicroServiceRegistryValidator = require('./registry/validator')

// TODO: incomplete
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
    /*
    TODO:
    - must get repo locally (git clone)
    - read service.yaml (validate specification)
    */
  }
}

module.exports = MicroserviceRegistry
