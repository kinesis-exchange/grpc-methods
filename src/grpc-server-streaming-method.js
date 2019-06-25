const GrpcMethod = require('./grpc-method')
const generateId = require('./generate-id')

/**
 * @class Wrapper for Server-streaming Grpc Methods
 * @extends {GrpcMethod}
 */
class GrpcServerStreamingMethod extends GrpcMethod {
  /**
   * @typedef {Object} GrpcServerStreamingMethod~request
   * @extends {GrpcMethod~request}
   * @property {Function} send Send data back to the client
   * @property {Function} onCancel Trigger a listener when the client cancels the stream
   */

  /**
   * Execute a server-streaming method and close the stream when it concludes
   *
   * @param  {grpc~ServerWritableStream} call
   * @return {void}
   */
  async exec (call) {
    // this object should be modified (but not replaced) by `method` in order to send
    // metadata back to the client. As such, we instantiate an empty object here and
    // keep a reference to it, so any additions or modifications made by `method` we
    // can capture.
    const responseMetadata = {}
    let request

    try {
      const { method, auth, createRequestLogger, requestOptions } = this

      // generate unique id to be associated with the request
      const requestId = generateId(6)

      // create the logger with the requestId and messageid
      const logger = createRequestLogger({ messageId: this.messageId, requestId })

      this.logRequestStart(logger)

      request = {
        params: call.request,
        logger,
        send: this.send.bind(this, call, logger),
        onCancel: (fn) => { call.on('cancelled', fn) },
        onError: (fn) => { call.on('error', fn) },
        metadata: call.metadata.getMap(),
        requestId,
        messageId: this.messageId,
        ...requestOptions
      }

      this.logRequestParams(request.logger, request.params)

      call.on('cancelled', () => {
        this.logRequestCancel(request.logger)
        this.logRequestEnd(request.logger)
      })

      if (auth) {
        logger.debug('Authenticating GRPC Request')
        await auth(request)
        logger.debug('Finished Authenticating GRPC Request')
      }

      await method(request, this.responses, responseMetadata)

      this.logRequestEnd(request.logger)

      call.end(this.metadata(responseMetadata))
    } catch (e) {
      this.logError(request.logger, e)

      // Normal writable streams would use .destroy, but gRPC writable
      // streams use .emit('error')
      // see: https://github.com/grpc/grpc-node/issues/287
      call.emit('error', this.grpcError(e, { metadata: responseMetadata }))
    }
  }

  /**
   * Send a chunk of data back to the client
   *
   * @param  {grpc~ServerWritableStream} call the active call to send the data to
   * @param  {Object} data payload to send to the client
   * @return {void}
   */
  send (call, logger, data) {
    this.logResponse(logger, data)
    call.write(data)
  }
}

module.exports = GrpcServerStreamingMethod
