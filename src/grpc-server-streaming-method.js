const GrpcMethod = require('./grpc-method')

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
    const responseMetadata = {}
    let request

    try {
      this.logRequestStart()

      const { method, logger, requestOptions } = this

      request = {
        params: call.request,
        logger: logger,
        send: this.send.bind(this, call),
        onCancel: (fn) => { call.on('cancelled', fn) },
        onError: (fn) => { call.on('error', fn) },
        metadata: call.metadata.getMap(),
        ...requestOptions
      }

      this.logRequestParams(request.params)

      call.on('cancelled', () => {
        this.logRequestCancel()
        this.logRequestEnd()
      })

      call.on('error', (e) => {
        this.logError(e)
        this.logRequestEnd()
      })

      await method(request, this.responses, responseMetadata)

      this.logRequestEnd()

      call.end(this.metadata(responseMetadata))
    } catch (e) {
      this.logError(e)

      call.destroy(this.grpcError(e, { metadata: responseMetadata }))
    }
  }

  /**
   * Send a chunk of data back to the client
   *
   * @param  {grpc~ServerWritableStream} call the active call to send the data to
   * @param  {Object} data payload to send to the client
   * @return {void}
   */
  send (call, data) {
    this.logResponse(data)
    call.write(data)
  }
}

module.exports = GrpcServerStreamingMethod
