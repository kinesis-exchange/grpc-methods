const path = require('path')
const { chai, rewire, sinon, delay } = require('test/test-helper')

const { expect } = chai

const GrpcServerStreamingMethod = rewire(path.resolve(__dirname, 'grpc-server-streaming-method'))

describe('GrpcServerStreamingMethod', () => {
  let method
  let requestOptions
  let call
  let GrpcMethod
  let logRequestStart
  let logRequestParams
  let logRequestEnd
  let logRequestCancel
  let logResponse
  let logError
  let grpcError
  let logger
  let responses
  let messageId
  let metadataStub
  let metadata
  let metadataContents
  let auth

  beforeEach(() => {
    GrpcMethod = sinon.stub()
    GrpcServerStreamingMethod.__set__('GrpcMethod', GrpcMethod)

    logRequestStart = sinon.stub(GrpcServerStreamingMethod.prototype, 'logRequestStart')
    logRequestParams = sinon.stub(GrpcServerStreamingMethod.prototype, 'logRequestParams')
    logRequestEnd = sinon.stub(GrpcServerStreamingMethod.prototype, 'logRequestEnd')
    logRequestCancel = sinon.stub(GrpcServerStreamingMethod.prototype, 'logRequestCancel')
    logResponse = sinon.stub(GrpcServerStreamingMethod.prototype, 'logResponse')
    logError = sinon.stub(GrpcServerStreamingMethod.prototype, 'logError')
    grpcError = sinon.stub(GrpcServerStreamingMethod.prototype, 'grpcError')
    metadataStub = sinon.stub(GrpcServerStreamingMethod.prototype, 'metadata')
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

    // Call definition https://grpc.io/grpc/node/grpc-ClientWritableStream.html
    call = {
      request: 'fake request',
      metadata,
      write: sinon.stub(),
      end: sinon.stub(),
      emit: sinon.stub(),
      on: sinon.stub(),
      getPeer: () => 'ipaddress'
    }
  })

  describe('#exec', () => {
    let grpcMethod

    beforeEach(() => {
      grpcMethod = new GrpcServerStreamingMethod(method, messageId, { logger, auth, ...requestOptions }, responses)
    })

    it('logs the start of the request', async () => {
      await grpcMethod.exec(call)
      expect(logRequestStart).to.have.been.calledOnce()
      expect(logRequestStart).to.have.been.calledBefore(method)
    })

    it('logs request params', async () => {
      await grpcMethod.exec(call)
      expect(logRequestParams).to.have.been.calledOnce()
      expect(logRequestParams).to.have.been.calledBefore(method)
      expect(logRequestParams).to.have.been.calledWith(call.request)
    })

    it('calls the assigned method', async () => {
      await grpcMethod.exec(call)
      expect(method).to.have.been.calledOnce()
    })

    describe('request', () => {
      it('provides a request object to the method', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match.object)
      })

      it('provides the params of the call', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match({ params: call.request }))
      })

      it('provides a logger for the method', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match({ logger }))
      })

      it('includes the request options', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match(requestOptions))
      })

      it('includes a send function', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match({ send: sinon.match.func }))
      })

      it('binds the send function to the current context', async () => {
        grpcMethod.send = sinon.stub()
        await grpcMethod.exec(call)
        const request = method.args[0][0]
        request.send()
        expect(grpcMethod.send).to.have.been.calledOnce()
        expect(grpcMethod.send).to.have.been.calledOn(grpcMethod)
      })

      it('includes an onCancel function', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match({ send: sinon.match.func }))
      })

      it('sets onCancel to the cancelled handler', async () => {
        const fakeListener = function () {
          return 'myfake'
        }

        await grpcMethod.exec(call)
        const request = method.args[0][0]

        request.onCancel(fakeListener)

        expect(call.on).to.have.been.calledWith('cancelled', fakeListener)
      })

      it('includes an onError function', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match({ send: sinon.match.func }))
      })

      it('sets onError to the cancelled handler', async () => {
        const fakeListener = function () {
          return 'myfake'
        }

        await grpcMethod.exec(call)
        const request = method.args[0][0]

        request.onError(fakeListener)

        expect(call.on).to.have.been.calledWith('error', fakeListener)
      })

      it('includes the client metadata', async () => {
        await grpcMethod.exec(call)
        expect(method).to.have.been.calledWith(sinon.match({ metadata: metadataContents }))
      })
    })

    it('calls an authorization function if present', async () => {
      await grpcMethod.exec(call)
      expect(auth).to.have.been.calledOnce()
    })

    it('skips auth if auth parameter is null', async () => {
      grpcMethod = new GrpcServerStreamingMethod(method, messageId, { logger, ...requestOptions }, responses)
      await grpcMethod.exec(call)
      expect(auth).to.not.have.been.calledOnce()
    })

    it('provides the responses to the method', async () => {
      await grpcMethod.exec(call)
      expect(method).to.have.been.calledWith(sinon.match.any, sinon.match(responses))
    })

    it('provides a response metadata object to be modified', async () => {
      await grpcMethod.exec(call)
      expect(method).to.have.been.calledWith(sinon.match.any, sinon.match.any, {})
    })

    describe('success', () => {
      beforeEach(() => {
        method.resolves()
      })

      it('logs the request end', async () => {
        await grpcMethod.exec(call)
        expect(logRequestEnd).to.have.been.calledOnce()
      })

      it('ends the server stream', async () => {
        await grpcMethod.exec(call)
        expect(call.end).to.have.been.calledOnce()
        expect(call.end).to.have.been.calledOn(call)
      })

      it('includes response metadata with the stream end', async () => {
        const fakeMetadata = { my: 'fake' }
        metadataStub.returns(fakeMetadata)

        await grpcMethod.exec(call)

        const responseMetadata = method.args[0][2]

        expect(metadataStub).to.have.been.calledOnce()
        expect(metadataStub).to.have.been.calledOn(grpcMethod)
        expect(metadataStub).to.have.been.calledWith(responseMetadata)
        expect(call.end).to.have.been.calledWith(fakeMetadata)
      })
    })

    describe('error', () => {
      describe('sync errors', () => {
        let fakeError

        beforeEach(() => {
          fakeError = new Error('fake')
          method.throws(fakeError)
        })

        it('logs errors when thrown', async () => {
          await grpcMethod.exec(call)

          expect(logError).to.have.been.calledOnce()
          expect(logError).to.have.been.calledWith(fakeError)
        })

        it('errors the call', async () => {
          await grpcMethod.exec(call)

          expect(call.emit).to.have.been.calledOnce()
          expect(call.emit).to.have.been.calledWith('error')
        })

        it('sends the error', async () => {
          const fakeFormatted = 'fake Error'
          grpcError.returns(fakeFormatted)

          await grpcMethod.exec(call)

          expect(grpcError).to.have.been.calledOnce()
          expect(grpcError).to.have.been.calledWith(fakeError)
          expect(call.emit).to.have.been.calledOnce()
          expect(call.emit).to.have.been.calledWith('error', fakeFormatted)
        })

        it('includes metadata with the error', async () => {
          await grpcMethod.exec(call)

          const responseMetadata = method.args[0][2]

          expect(grpcError).to.have.been.calledWith(sinon.match.any, sinon.match({ metadata: responseMetadata }))
        })
      })

      describe('async errors', () => {
        let fakeError

        beforeEach(() => {
          fakeError = new Error('fake')
          method.rejects(fakeError)
        })

        it('logs errors when thrown', async () => {
          grpcMethod.exec(call)

          await delay(20)

          expect(logError).to.have.been.calledOnce()
          expect(logError).to.have.been.calledWith(fakeError)
        })

        it('errors the call', async () => {
          grpcMethod.exec(call)

          await delay(20)

          expect(call.emit).to.have.been.calledOnce()
          expect(call.emit).to.have.been.calledWith('error')
        })

        it('sends the error', async () => {
          const fakeFormatted = 'fake Error'
          grpcError.returns(fakeFormatted)

          grpcMethod.exec(call)

          await delay(20)

          expect(grpcError).to.have.been.calledOnce()
          expect(grpcError).to.have.been.calledWith(fakeError)
          expect(call.emit).to.have.been.calledOnce()
          expect(call.emit).to.have.been.calledWith('error', fakeFormatted)
        })

        it('includes metadata with the error', async () => {
          grpcMethod.exec(call)

          await delay(20)

          const responseMetadata = method.args[0][2]

          expect(grpcError).to.have.been.calledWith(sinon.match.any, sinon.match({ metadata: responseMetadata }))
        })
      })
    })

    describe('cancel', () => {
      beforeEach(() => {
        // want this promise to never resolve
        method.returns(new Promise(() => {}))
        call.on.callsFake(async (evt, cb) => {
          if (evt === 'cancelled') {
            await delay(20)
            cb()
          }
        })
      })

      it('logs on request cancel', async () => {
        grpcMethod.exec(call)

        await delay(20)

        expect(logRequestCancel).to.have.been.calledOnce()
      })

      it('logs request end on client cancel', async () => {
        grpcMethod.exec(call)

        await delay(20)

        expect(logRequestEnd).to.have.been.calledOnce()
      })
    })

    describe('error', () => {
      beforeEach(() => {
        // want this promise to never resolve
        method.returns(new Promise(() => {}))
        call.on.callsFake(async (evt, cb) => {
          if (evt === 'error') {
            await delay(20)
            cb()
          }
        })
      })

      it('logs an error on client error', async () => {
        grpcMethod.exec(call)
        await delay(20)
        expect(logError).to.have.been.calledOnce()
      })

      it('logs request end on client error', async () => {
        grpcMethod.exec(call)
        await delay(20)
        expect(logRequestEnd).to.have.been.calledOnce()
      })
    })
  })

  describe('#send', () => {
    let grpcMethod

    beforeEach(() => {
      grpcMethod = new GrpcServerStreamingMethod(method, messageId, requestOptions)
    })

    it('logs data that is sent', () => {
      const fakeData = 'fake'
      grpcMethod.send(call, fakeData)

      expect(logResponse).to.have.been.calledOnce()
      expect(logResponse).to.have.been.calledWith(fakeData)
    })

    it('writes sent data to the server stream', () => {
      const fakeData = 'fake'
      grpcMethod.send(call, fakeData)

      expect(call.write).to.have.been.calledOnce()
      expect(call.write).to.have.been.calledWith(fakeData)
      expect(call.write).to.have.been.calledOn(call)
    })
  })
})
