const path = require('path')
const { chai, rewire, sinon } = require('test/test-helper')

const { expect } = chai

const GrpcUnaryMethod = rewire(path.resolve(__dirname, 'grpc-unary-method'))

describe('GrpcUnaryMethod', () => {
  let method
  let requestOptions
  let call
  let sendUnaryData
  let GrpcMethod
  let logRequestStart
  let logRequestParams
  let logRequestEnd
  let logResponse
  let logError
  let metadataStub
  let grpcError
  let logger
  let responses
  let messageId
  let metadata
  let metadataContents
  let auth

  beforeEach(() => {
    GrpcMethod = sinon.stub()
    GrpcUnaryMethod.__set__('GrpcMethod', GrpcMethod)

    logRequestStart = sinon.stub(GrpcUnaryMethod.prototype, 'logRequestStart')
    logRequestParams = sinon.stub(GrpcUnaryMethod.prototype, 'logRequestParams')
    logRequestEnd = sinon.stub(GrpcUnaryMethod.prototype, 'logRequestEnd')
    logResponse = sinon.stub(GrpcUnaryMethod.prototype, 'logResponse')
    logError = sinon.stub(GrpcUnaryMethod.prototype, 'logError')
    metadataStub = sinon.stub(GrpcUnaryMethod.prototype, 'metadata')
    grpcError = sinon.stub(GrpcUnaryMethod.prototype, 'grpcError')
    auth = sinon.stub().resolves(true)

    logger = {
      error: sinon.stub(),
      info: sinon.stub(),
      debug: sinon.stub()
    }

    responses = {
      FakeResponse: sinon.stub()
    }

    messageId = '[FakeService:mymethod]'

    method = sinon.stub()
    requestOptions = {
      fake: 'option'
    }
    metadataContents = {
      fakemeta: 'mymeta'
    }
    metadata = {
      getMap () {
        return metadataContents
      }
    }

    call = {
      request: 'fake request',
      metadata
    }
    sendUnaryData = sinon.stub()
  })

  describe('#exec', () => {
    let grpcMethod

    beforeEach(() => {
      grpcMethod = new GrpcUnaryMethod(method, messageId, { logger, auth, ...requestOptions }, responses)
    })

    it('logs the start of the request', () => {
      grpcMethod.exec(call, sendUnaryData)
      expect(logRequestStart).to.have.been.calledOnce()
      expect(logRequestStart).to.have.been.calledBefore(method)
    })

    it('logs request params', () => {
      grpcMethod.exec(call, sendUnaryData)
      expect(logRequestParams).to.have.been.calledOnce()
      expect(logRequestParams).to.have.been.calledBefore(method)
      expect(logRequestParams).to.have.been.calledWith(call.request)
    })

    it('calls the assigned method', async () => {
      await grpcMethod.exec(call, sendUnaryData)
      expect(method).to.have.been.calledOnce()
    })

    describe('request', () => {
      let requestStub

      beforeEach(() => {
        requestStub = Object.assign({}, { params: call.request, logger }, requestOptions)
      })

      it('provides a request object to the method', async () => {
        await grpcMethod.exec(call, sendUnaryData)
        expect(method).to.have.been.calledWith(sinon.match(requestStub))
      })

      it('provides the params of the call', async () => {
        await grpcMethod.exec(call, sendUnaryData)
        expect(method).to.have.been.calledWith(sinon.match({ params: call.request }))
      })

      it('provides a logger for the method', async () => {
        await grpcMethod.exec(call, sendUnaryData)
        expect(method).to.have.been.calledWith(sinon.match({ logger }))
      })

      it('provides the client metadata', async () => {
        await grpcMethod.exec(call, sendUnaryData)
        expect(method).to.have.been.calledWith(sinon.match({ metadata: metadataContents }))
      })
    })

    it('calls an authorization function if present', () => {
      grpcMethod.exec(call, sendUnaryData)
      expect(auth).to.have.been.calledOnce()
    })

    it('skips auth if auth parameter is null', () => {
      grpcMethod = new GrpcUnaryMethod(method, messageId, { logger, ...requestOptions }, responses)
      grpcMethod.exec(call, sendUnaryData)
      expect(auth).to.not.have.been.calledOnce()
    })

    it('provides the responses to the method', async () => {
      await grpcMethod.exec(call, sendUnaryData)
      expect(method).to.have.been.calledWith(sinon.match.any, sinon.match(responses))
    })

    it('provides a response metadata object modify', async () => {
      await grpcMethod.exec(call, sendUnaryData)
      expect(method).to.have.been.calledWith(sinon.match.any, sinon.match.any, {})
    })

    describe('success', () => {
      let fakeResponse

      beforeEach(() => {
        fakeResponse = 'hello'
        method.resolves(fakeResponse)
      })

      it('logs successful response', async () => {
        await grpcMethod.exec(call, sendUnaryData)

        expect(logResponse).to.have.been.calledOnce()
        expect(logResponse).to.have.been.calledWith(fakeResponse)
      })

      it('sends the method output as unary data', async () => {
        await grpcMethod.exec(call, sendUnaryData)

        expect(sendUnaryData).to.have.been.calledOnce()
        expect(sendUnaryData).to.have.been.calledWith(null, fakeResponse)
      })

      it('sends metadata with the output', async () => {
        const fakeMetadata = 'goodbye'
        metadataStub.returns(fakeMetadata)

        await grpcMethod.exec(call, sendUnaryData)

        expect(sendUnaryData).to.have.been.calledOnce()
        expect(sendUnaryData.args[0][2]).to.be.equal(fakeMetadata)
        expect(metadataStub).to.have.been.calledWith(method.args[0][2])
      })
    })

    describe('fail', () => {
      let fakeError

      beforeEach(() => {
        fakeError = new Error('fake')
        method.rejects(fakeError)
      })

      it('logs errors', async () => {
        await grpcMethod.exec(call, sendUnaryData)

        expect(logError).to.have.been.calledOnce()
        expect(logError).to.have.been.calledWith(fakeError)
      })

      it('sends an error as unary data', async () => {
        const fakeFormatted = 'fake Error'
        grpcError.returns(fakeFormatted)

        await grpcMethod.exec(call, sendUnaryData)

        expect(grpcError).to.have.been.calledOnce()
        expect(grpcError).to.have.been.calledWith(fakeError)
        expect(sendUnaryData).to.have.been.calledOnce()
        expect(sendUnaryData).to.have.been.calledWith(fakeFormatted)
      })

      it('includes metadata with the error', async () => {
        const fakeMetadata = 'goodbye'
        metadataStub.returns(fakeMetadata)

        await grpcMethod.exec(call, sendUnaryData)

        expect(sendUnaryData).to.have.been.calledOnce()
        expect(sendUnaryData.args[0][2]).to.be.equal(fakeMetadata)
        expect(metadataStub).to.have.been.calledWith(method.args[0][2])
      })
    })

    it('logs on successful request end', async () => {
      method.rejects()

      await grpcMethod.exec(call, sendUnaryData)

      expect(logRequestEnd).to.have.been.calledOnce()
    })

    it('logs on failed request end', async () => {
      method.resolves()

      await grpcMethod.exec(call, sendUnaryData)

      expect(logRequestEnd).to.have.been.calledOnce()
    })
  })
})
