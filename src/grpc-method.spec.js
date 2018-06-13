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
  let logger
  let responses
  let messageId

  beforeEach(() => {
    PublicError = sinon.stub()
    GrpcMethod.__set__('PublicError', PublicError)

    grpcMetadata = sinon.stub()
    grpcMetadataAdd = sinon.stub()
    grpcMetadata.prototype.add = grpcMetadataAdd
    GrpcMethod.__set__('grpc', {
      Metadata: grpcMetadata,
      status: grpcStatus
    })

    logger = sinon.stub()
    responses = {
      FakeResponse: sinon.stub()
    }
    messageId = '[FakeService:mymethod]'

    method = sinon.stub()
    requestOptions = {
      fake: 'opts'
    }
  })

  describe('new', () => {
    it('assigns the method', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('method')
      expect(grpcMethod.method).to.be.equal(method)
    })

    it('assigns the message id', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('messageId')
      expect(grpcMethod.messageId).to.be.equal(messageId)
    })

    it('aliases the service logger', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('logger')
      expect(grpcMethod.logger).to.be.equal(logger)
    })

    it('aliases the object of responses', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('responses')
      expect(grpcMethod.responses).to.be.equal(responses)
    })

    it('assigns the request options', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)

      expect(grpcMethod).to.have.property('requestOptions')
      expect(grpcMethod.requestOptions).to.be.eql(requestOptions)
    })
  })

  describe('#exec', () => {
    it('throws the unimplemented exec', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)

      expect(grpcMethod.exec).to.throw()
    })
  })

  describe('#register', () => {
    it('binds exec to the GrpcMethod context', () => {
      const grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)

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
      grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)
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
      grpcMethod = new GrpcMethod(method, messageId, { logger, ...requestOptions }, responses)
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

    it('adds custom metadata to the error', () => {
      const err = new Error('fake error')
      const customMeta = {
        hello: 'darkness',
        myOld: 'friend'
      }
      const grpcErr = grpcMethod.grpcError(err, { metadata: customMeta })

      expect(grpcMetadataAdd).to.have.been.calledWith('hello', 'darkness')
      expect(grpcMetadataAdd).to.have.been.calledWith('myOld', 'friend')
    })

    xit('marks errors as internal')

    xit('defaults the error message')

    xit('it uses the error message for public errors')
  })
})
