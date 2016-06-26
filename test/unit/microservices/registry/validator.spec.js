'use strict'

const path = require('path')
const expect = require('chai').expect
const MicroServiceRegistryValidator = require('../../../../lib/microservice/registry/validator')

const FULL_SPEC_PATH = path.join('../../../resources/registry')
const FULL_SPEC = require(FULL_SPEC_PATH)

describe('MicroServiceRegistryValidator', function () {
  describe('#validate()', function () {
    let spec
    beforeEach(function () {
      spec = JSON.parse(JSON.stringify(FULL_SPEC))
    })

    let validator
    beforeEach(function () {
      validator = new MicroServiceRegistryValidator()
    })

    it('should not throw if given a full, valid registry config', function () {
      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should throw if a service name ends with -mocks', function () {
      spec['myservice-mocks'] = {}
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'myservice-mocks\' cannot have name that ends '
        + 'with \'-mocks\', this suffix is reserved.\'')
    })

    it('should throw if the registry is not an object', function () {
      spec = []
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: registy must be an object.')

      spec = 555
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: registy must be an object.')
    })

    it('should throw if there is no root git property in a service config', function () {
      delete spec.testMicrosvc.git
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'testMicrosvc\' must contain root \'git\' property.\'')
    })

    it('should throw if there is no mocks property in a service config', function () {
      delete spec.testMicrosvc.mocks
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'testMicrosvc\' must contain \'mocks\' property.\'')
    })

    it('should throw if the mocks property has no root or git property', function () {
      delete spec.testMicrosvc.mocks.git
      delete spec.testMicrosvc.mocks.root
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'testMicrosvc\' must contain \'mocks\' property with'
        + ' \'git\' or \'root\' properties.\'')
    })

    it('should not throw if the mocks property has only a root entry', function () {
      delete spec.testMicrosvc.mocks.git
      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should not throw if the mocks property has only a git entry', function () {
      delete spec.testMicrosvc.mocks.root
      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should not throw if there is no environments object', function () {
      delete spec.testMicrosvc.environments
      expect(() => validator.validate(spec)).to.not.throw(Error)
    })

    it('should throw if the environments property is not an object', function () {
      spec.testMicrosvc.environments = []
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'testMicrosvc\' has invalid \'endpoints\''
        + ' property; it must be an object.\'')

      spec.testMicrosvc.environments = 555
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'testMicrosvc\' has invalid \'endpoints\''
        + ' property; it must be an object.\'')
    })

    it('should throw if an environment value is not a string', function () {
      spec.testMicrosvc.environments.dev = 555
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'testMicrosvc\' has invalid \'endpoints\''
        + ' entry; dev must be a string.\'')
    })

    it('should throw if an environment value has an invalid URL', function () {
      spec.testMicrosvc.environments.dev = 'abc/thisisnot;a:url/&/?/'
      expect(() => validator.validate(spec)).to.throw(Error,
        'Invalid microservice registry: section \'testMicrosvc\' has invalid \'endpoints\''
        + ' entry; dev must be a URL.\'')
    })
  })
})
