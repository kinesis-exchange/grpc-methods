const grpc = require('grpc')
const { PublicError } = require('./errors')

/**
 * Abstract class for creating Grpc method wrappers
 */
class GrpcMethod {
  /**
   * @typedef {Object} GrpcMethod~request
   * @property {Object} params Request parameters from the client
   * @property {Object} logger Logger to be used by the method
   * @property {Object} metadata Metadata from the client
   * @property {*} * Additional parameters to be included in each request object
   */

  /**
   * @typedef {Function} GrpcMethod~method
   * @param {GrpcMethod~request} request Request object constructed by a GrpcMethod wrapper
   * @param {Object} responses Response constructors to pass to the method
   * @param {Object} responseMetadata Metadata that will be returned to the client. This can be modified by adding properties to it.
   */

  /**
   * Creates a Grpc method wrapper
   *
   * @param  {GrpcMethod~method} method - Method to be wrapped and called during execution
   * @param  {string}            messageId - Identifier for log messages and public messages. Typically '[${serviceName}:${methodName}]'
   * @param  {Object}            options
   * @param  {boolean}           options.privateErrors - Whether the errors thrown when running this method should have their messages returned to the user by default.
   * @param  {Object}            options.createLogger - function that when called returns logger
   * @param  {*}                 options.* - additional parameters to be included in each request object
   * @param  {Object}            responses - Response constructors to pass to the method
   * @param  {GrpcMethod~method} auth - method called before request
   * @return {GrpcMethod}
   */
  constructor (method, messageId = '', { privateErrors = false, createLogger = (() => console), auth = null, ...requestOptions } = {}, responses = {}) {
    // Method definition
    this.method = method

    // whether errors thrown in the method should be private (i.e. not returned to the caller)
    this.privateErrors = privateErrors

    // Logger helper
    this.messageId = messageId

    // function to create logger
    this.createRequestLogger = createLogger

    // Options to include in every request object
    this.requestOptions = requestOptions

    // Response constructors
    this.responses = responses

    // Authentication middleware definition
    this.auth = auth
  }

  /**
   * Abstract function to be implemented by subclasses for method execution
   *
   * @param  {grpc.internal~Call}
   * @return {void}
   */
  exec (call) {
    throw new Error('Unimplemented Abstract Method')
  }

  /**
   * Create a function that can be used as a service implementation in grpc.Server#addService
   *
   * @return {function} GrpcMethod#exec bound to the instance context
   */
  register () {
    return this.exec.bind(this)
  }

  /**
   * Generates timestamp meta data for a grpc request
   *
   * @param {Object} customMeta Key value object of custom metadata to add
   * @return {grpc#Metadata}
   */
  metadata (customMeta = {}) {
    const meta = new grpc.Metadata()
    Object.entries(customMeta).forEach(([key, value]) => meta.add(key, value))
    meta.add('timestamp', (new Date()).toString())
    return meta
  }

  /**
   * @typedef {Object} GrpcError
   * @property {number} code Grpc Status code for the error
   * @property {string} message Message to be delivered to the client
   * @property {grpc#Metadata} metadata Metadata to be delivered to the client
   */

  /**
   * Format errors for consumption by external grpc clients
   *
   * @param  {error}           err                                   Error to be formatted for public consumption
   * @param  {Object}          [options={}]
   * @param  {Object}          [options.metadata={}]                 Custom metadata to be added to this error
   * @param  {grpc.status<ANY>} [options.status=grpc.status.INTERNAL] GRPC Status code to be included with the error
   * @return {GrpcError}
   */
  grpcError (err, { metadata = {}, status = grpc.status.INTERNAL } = {}) {
    let message = 'Call terminated before completion'

    // if the error is marked as public, or if this method is publicizing
    // errors by default, we should include the message
    if (!this.privateErrors || err instanceof PublicError) {
      message = err.message
    }

    return {
      code: status,
      message: `${this.messageId} ${message}`,
      metadata: this.metadata(metadata)
    }
  }

  /**
   * Log the start of a request
   * @param {Object} logger Logger to be used by the method
   * @return {void}
   */
  logRequestStart (logger) {
    logger.info('Request received')
  }

  /**
   * Log the parameters of a request
   *
   * @param {Object} logger Logger to be used by the method
   * @param  {Object} parameters of the request
   * @return {void}
   */
  logRequestParams (logger, params) {
    logger.debug('Request made with payload', params)
  }

  /**
   * Log client cancellation of a request
   *
   * @param {Object} logger Logger to be used by the method
   * @return {void}
   */
  logRequestCancel (logger) {
    logger.info('Request cancelled by client')
  }

  /**
   * Log completion (successful or otherwise) of a request
   *
   * @param {Object} logger Logger to be used by the method
   * @return {void}
   */
  logRequestEnd (logger) {
    logger.info('Request completed')
  }

  /**
   * Log data that will be sent to the client
   *
   * @param {Object} logger Logger to be used by the method
   * @param  {Object} data
   * @return {void}
   */
  logResponse (logger, data) {
    logger.info('Response generated')
    logger.debug('Responding with payload', data)
  }

  /**
   * Log errors generated while handling request
   *
   * @param {Object} logger Logger to be used by the method
   * @param  {error} err
   * @return {void}
   */
  logError (logger, err) {
    logger.error('Error while handling request')
    logger.error(err.stack)
  }
}

module.exports = GrpcMethod
