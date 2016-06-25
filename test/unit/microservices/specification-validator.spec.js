'use strict'

const path = require('path')
const MicroserviceSpecificationValidator = require('../../../lib/microservice/specification-validator')
const MicroserviceEcosystem = require('../../../lib/microservice/ecosystem')
const expect = require('chai').expect

const FULL_SPEC_PATH = path.join(__dirname, '../../resources/full-spec')
const FULL_SPEC = require(FULL_SPEC_PATH)

describe('MicroserviceSpecificationValidator', function () {
  describe('#validate()', function () {
    let spec
    beforeEach(function () {
      spec = JSON.parse(JSON.stringify(FULL_SPEC))
    })

    let ecosystem
    let validator
    beforeEach(function () {
      ecosystem = new MicroserviceEcosystem({
        testMicrosvc: {},
        'feature-flags': {},
      })

      validator = new MicroserviceSpecificationValidator(ecosystem)
    })

    it('should not throw when given a full, valid specification', function () {
      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    // setup section
    it('should not throw if setup section is missing', function () {
      delete spec.setup

      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should throw if setup section is not an array', function () {
      spec.setup = { a: 'b' }

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'setup\' property must be an array.')
    })

    it('should not throw if setup section is empty', function () {
      spec.setup = []

      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should throw if setup section has non-string value', function () {
      spec.setup = [
        { a: 'b' },
        5,
      ]

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'setup\' property contains invalid entry at index 0.')
    })

    // dependencies section
    it('should not throw if dependencies is mising', function () {
      delete spec.dependencies

      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should throw if dependencies is not an array', function () {
      spec.dependencies = { a: 'b' }

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'dependencies\' property must be an array.')
    })

    it('should throw if dependencies contains a non-string', function () {
      spec.dependencies = [
        { a: 'b' },
        5,
      ]

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'dependencies\' property contains invalid entry at index 0.')
    })

    it('should throw if dependencies contains an unknown microservice', function () {
      spec.dependencies = [
        'whatsthis',
      ]

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'dependencies\' property has unknown microservice \'whatsthis\','
        + ' make sure it is in the registry.')
    })

    // services section
    it('should throw if the services section is missing', function () {
      delete spec.services

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'services\' property must exist.')
    })

    it('should throw if the services section is not an object', function () {
      spec.services = []
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'services\' property must be an object.')

      spec.services = 55
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'services\' property must be an object.')
    })

    it('should throw if the services section is empty', function () {
      spec.services = {}

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'services\' property must expose at least one container.')
    })

    // public section
    it('should throw if the public section does not exist', function () {
      delete spec.public

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'public\' property must exist.')
    })

    it('should throw if the public section is not an array', function () {
      spec.public = {}

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'public\' property must be an array')
    })

    it('should throw if the public section is empty', function () {
      spec.public = []

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'public\' property must expose at least one public container.')
    })

    it('should throw if the public section has an entry that doesn\'t exist in the services section', function () {
      spec.public = [
        'web',
        'queue',
      ]

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'public\' property exposes unknown service \'queue\'.')
    })

    // namespace section
    it('should throw if the namespace value does not exist', function () {
      delete spec.namespace

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'namespace\' property must exist.')
    })

    it('should throw if the namespace value is not a string', function () {
      spec.namespace = {}

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'namespace\' property must be a string.')
    })

    it('should throw if the namespace value has an invalid value', function () {
      spec.namespace = 'invalid$container&namespace'

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'namespace\' property must match regex \'/^[a-zA-Z_0-9-]+$/\'.')
    })

    // root section
    it('should not throw if the root section does not exist', function () {
      delete spec.root

      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should throw if the root section is not a string', function () {
      spec.root = { a: 'b' }

      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice spec: \'root\' property must be a string.')
    })
  })
})
