/**
 * Kinesis test helper
 *
 * NOTE: This file is specifically loaded before all tests so that we
 * can globally require some files.
 *
 */
const sinon = require('sinon')
const chai = require('chai')
const rewire = require('rewire')
const dirtyChai = require('dirty-chai')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const delay = require('timeout-as-promise')
const timekeeper = require('timekeeper')

const { expect, Assertion } = chai

chai.use(dirtyChai)
chai.use(sinonChai)
chai.use(chaiAsPromised)

let sandbox = sinon.createSandbox()

afterEach(() => {
  sandbox.restore()
})

module.exports = {
  chai,
  expect,
  sinon: sandbox,
  rewire,
  delay,
  timekeeper
}
