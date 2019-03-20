const crypto = require('crypto')

/**
 * Generate a unique ID with base64 url encoding
 * @param {number} [numBytes=18] - Number of random bytes to include in the ID
 * @returns {string} Random string with 4/3*numBytes characters
 */
function generateId (numBytes = 18) {
  return urlEncode(crypto.randomBytes(numBytes).toString('base64'))
}

/**
 * Convert a string from Base64 to [Base64url]{@link https://tools.ietf.org/html/rfc4648}
 * @param {string} base64Str - Base64 encoded String
 * @returns {string} Base64url encoded string
 */
function urlEncode (base64Str) {
  return base64Str
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

module.exports = generateId
