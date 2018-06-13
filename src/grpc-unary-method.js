const GrpcMethod = require('./grpc-method')

/**
 * @class Creates a wrapper for Grpc Unary method
 * @extends {GrpcMethod}
 */
class GrpcUnaryMethod extends GrpcMethod {
  /**
   * @typedef {Object} GrpcUnaryMethod~request
   * @extends {GrpcMethod~request}
   */

  /**
   * Execute a unary method and return a response to the client
   *
   * @param  {grpc~ServerUnaryCall}
   * @param  {grpc.Server~sendUnaryData}
   * @return {void}
   */
  async exec (call, sendUnaryData) {
    let request

    try {
      this.logRequestStart()

      const { method, logger, requestOptions } = this

      /**
       * Request for the method
       * @type {GrpcUnaryMethod~request}
       */
      request = {
        params: call.request,
        logger,
        metadata: {},
        ...requestOptions
      }

      this.logRequestParams(request.params)

      const response = await method(request, this.responses)

      this.logResponse(response)

      // sendUnaryData expects a callback-like signature, so we leave the first parameter null in the success case
      return sendUnaryData(null, response, this.metadata(request.metadata))
    } catch (err) {
      this.logError(err)

      // sendUnaryData expects a callback-like signature, so we put the error in the first parameter
      return sendUnaryData(this.grpcError(err), null, this.metadata(request.metadata))
    } finally {
      this.logRequestEnd()
    }
  }
}

module.exports = GrpcUnaryMethod
