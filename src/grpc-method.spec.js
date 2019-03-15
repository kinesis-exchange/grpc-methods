const path = require('path')
const { chai, rewire, sinon, timekeeper } = require('test/test-helper')

const { expect } = chai

const GrpcMethod = rewire(path.resolve(__dirname, 'grpc-method'))

describe('GrpcMethod', () => {
  let grpcMetadata
  let grpcMetadataAdd
  let grpcStatus = {
    INTERNAL: 14
  }
  let PublicError
  let method
  let requestOptions
  let createLogger
  let responses
  let messageId
  let auth

  beforeEach(() => {
    PublicError = GrpcMethod.__get__('PublicError')

    grpcMetadata = sinon.stub()
    grpcMetadataAdd = sinon.stub()
    grpcMetadata.prototype.add = grpcMetadataAdd
    GrpcMethod.__set__('grpc', {
      Metadata: grpcMetadata,
      status: grpcStatus
    })

    createLogger = sinon.stub()
    responses = {
      FakeResponse: sinon.stub()
    }
    messageId = '[FakeService:mymethod]'

    method = sinon.stub()
    requestOptions = {
      fake: 'opts'
    }
    auth = sinon.stub()
  })

  describe('new', () => {
    it('assigns the method', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('method')
      expect(grpcMethod.method).to.be.equal(method)
    })

    it('assigns the message id', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('messageId')
      expect(grpcMethod.messageId).to.be.equal(messageId)
    })

    it('aliases the service logger', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('createLogger')
      expect(grpcMethod.createLogger).to.be.equal(createLogger)
    })

    it('aliases the object of responses', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('responses')
      expect(grpcMethod.responses).to.be.equal(responses)
    })

    it('assigns the request options', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('requestOptions')
      expect(grpcMethod.requestOptions).to.be.eql(requestOptions)
    })

    it('assigns an authorization function if present', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, auth, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('auth')
      expect(grpcMethod.auth).to.be.equal(auth)
    })

    it('assigns authorization to null', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('auth')
      expect(grpcMethod.auth).to.be.null()
    })

    it('marks errors public by default', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('privateErrors', false)
    })

    it('marks errors  private if specified', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { privateErrors: true, createLogger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('privateErrors', true)
    })
  })

  describe('#exec', () => {
    it('throws the unimplemented exec', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      expect(grpcMethod.exec).to.throw()
    })
  })

  describe('#register', () => {
    it('binds exec to the GrpcMethod context', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)

      grpcMethod.exec = sinon.stub()

      const bound = grpcMethod.register()

      bound()

      expect(grpcMethod.exec).to.have.been.calledOnce()
      expect(grpcMethod.exec).to.have.been.calledOn(grpcMethod)
    })
  })

  describe('#metatdata', () => {
    let grpcMethod

    beforeEach(() => {
      grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)
    })

    it('creates grpc metadata', () => {
      const meta = grpcMethod.metadata()

      expect(meta).to.be.instanceof(grpcMetadata)
    })

    it('adds a timestamp to the metadata', () => {
      const time = new Date()
      timekeeper.freeze(time)

      grpcMethod.metadata()

      expect(grpcMetadataAdd).to.have.been.calledOnce()
      expect(grpcMetadataAdd).to.have.been.calledWith('timestamp', time.toString())

      timekeeper.reset()
    })

    it('adds custom metadata', () => {
      const customMeta = {
        hello: 'darkness',
        myOld: 'friend'
      }

      grpcMethod.metadata(customMeta)

      expect(grpcMetadataAdd).to.have.been.calledWith('hello', 'darkness')
      expect(grpcMetadataAdd).to.have.been.calledWith('myOld', 'friend')
    })
  })

  describe('#grpcError', () => {
    let grpcMethod

    beforeEach(() => {
      grpcMethod = new GrpcMethod(method, messageId, { createLogger, ...requestOptions }, responses)
    })

    it('creates a grpc-compliant error object', () => {
      const err = new Error('fake error')
      const grpcErr = grpcMethod.grpcError(err)

      expect(grpcErr).to.be.a('object')
      expect(Object.keys(grpcErr)).to.have.lengthOf(3)
      expect(grpcErr).to.have.property('code')
      expect(grpcErr).to.have.property('message')
      expect(grpcErr).to.have.property('metadata')
      expect(grpcErr.metadata).to.be.instanceOf(grpcMetadata)
    })

    it('uses a custom error code if available', () => {
      const err = new Error('fake error')
      const fakeStatusCode = 16
      const grpcErr = grpcMethod.grpcError(err, { status: fakeStatusCode })

      expect(grpcErr.code).to.be.equal(fakeStatusCode)
    })

    it('marks errors as internal by default', () => {
      const err = new Error('fake error')
      const grpcErr = grpcMethod.grpcError(err)

      expect(grpcErr.code).to.be.equal(grpcStatus.INTERNAL)
    })

    it('adds custom metadata to the error', () => {
      const err = new Error('fake error')
      const customMeta = {
        hello: 'darkness',
        myOld: 'friend'
      }

      grpcMethod.grpcError(err, { metadata: customMeta })

      expect(grpcMetadataAdd).to.have.been.calledWith('hello', 'darkness')
      expect(grpcMetadataAdd).to.have.been.calledWith('myOld', 'friend')
    })

    it('makes error messages public by default', () => {
      const err = new Error('fake error')
      const grpcErr = grpcMethod.grpcError(err)

      expect(grpcErr.message).to.include('fake error')
    })

    it('makes error message private if the method has private errors', () => {
      grpcMethod.privateErrors = true

      const err = new Error('fake error')
      const grpcErr = grpcMethod.grpcError(err)

      expect(grpcErr.message).to.include('Call terminated before completion')
    })

    it('makes error messages public if they are PublicErrors', () => {
      grpcMethod.privateErrors = true

      const err = new PublicError('fake error')
      const grpcErr = grpcMethod.grpcError(err)

      expect(grpcErr.message).to.include('fake error')
    })
  })
})
