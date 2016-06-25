'use strict'

// TODO: dummy implementation, make real
class MicroserviceEcosystem {
  constructor(microservices) {
    this.microservices = microservices
  }

  exists(microserviceName) {
    return !! this.microservices[microserviceName]
  }
}

module.exports = MicroserviceEcosystem
