const GrpcMethod = require('./grpc-method')
const generateId = require('./generate-id')
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
    // this object should be modified (but not replaced) by `method` in order to send
    // metadata back to the client. As such, we instantiate an empty object here and
    // keep a reference to it, so any additions or modifications made by `method` we
    // can capture.
    const responseMetadata = {}
    let request

    try {
      this.logRequestStart()

      const { method, auth, createLogger, requestOptions } = this
      const requestId = generateId()

      const logger = createLogger({ messageId: this.messageId, requestId })
      /**
       * Request for the method
       * @type {GrpcUnaryMethod~request}
       */
      request = {
        params: call.request,
        logger,
        metadata: call.metadata.getMap(),
        requestId,
        ...requestOptions
      }

      this.logRequestParams(request.params)

      if (auth) {
        logger.debug('Authenticating GRPC Request')
        await auth(request)
        logger.debug('Finished Authenticating GRPC Request')
      }

      const response = await method(request, this.responses, responseMetadata)

      this.logResponse(response)

      // sendUnaryData expects a callback-like signature, so we leave the first parameter null in the success case
      return sendUnaryData(null, response, this.metadata(responseMetadata))
    } catch (err) {
      this.logError(err)

      // sendUnaryData expects a callback-like signature, so we put the error in the first parameter
      return sendUnaryData(this.grpcError(err), null, this.metadata(responseMetadata))
    } finally {
      this.logRequestEnd()
    }
  }
}

module.exports = GrpcUnaryMethod
