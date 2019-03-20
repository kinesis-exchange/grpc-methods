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
      const { method, auth, createRequestLogger, requestOptions } = this

      // generate unique id to be associated with the request
      const requestId = generateId(6)

      // create the logger with the requestId and messageid
      const logger = createRequestLogger({ messageId: this.messageId, requestId })

      this.logRequestStart(logger)

      /**
       * Request for the method
       * @type {GrpcUnaryMethod~request}
       */
      request = {
        params: call.request,
        logger,
        metadata: call.metadata.getMap(),
        requestId,
        messageId: this.messageId,
        ...requestOptions
      }

      this.logRequestParams(request.logger, request.params)

      if (auth) {
        logger.debug('Authenticating GRPC Request')
        await auth(request)
        logger.debug('Finished Authenticating GRPC Request')
      }

      const response = await method(request, this.responses, responseMetadata)

      this.logResponse(request.logger, response)

      // sendUnaryData expects a callback-like signature, so we leave the first parameter null in the success case
      return sendUnaryData(null, response, this.metadata(responseMetadata))
    } catch (err) {
      this.logError(request.logger, err)

      // sendUnaryData expects a callback-like signature, so we put the error in the first parameter
      return sendUnaryData(this.grpcError(err), null, this.metadata(responseMetadata))
    } finally {
      this.logRequestEnd(request.logger)
    }
  }
}

module.exports = GrpcUnaryMethod
