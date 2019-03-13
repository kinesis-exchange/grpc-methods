const path = require('path')
const { sinon, rewire, expect } = require('test/test-helper')

const generateId = rewire(path.resolve(__dirname, 'generate-id'))

describe('generateId', () => {
  describe('generateId', () => {
    let urlEncode
    let crypto
    let bytes
    let resetUrlEncode
    let resetCrypto
    let randomBase64
    let randomUrlEncoded

    beforeEach(() => {
      randomBase64 = 'asfdjJF09809ASDFasdf+asdf/asdf='
      randomUrlEncoded = 'asfdjJF09809ASDFasdf-asdf_asdf'

      urlEncode = sinon.stub().returns(randomUrlEncoded)

      bytes = {
        toString: sinon.stub().returns(randomBase64)
      }

      crypto = {
        randomBytes: sinon.stub().returns(bytes)
      }

      resetUrlEncode = generateId.__set__('urlEncode', urlEncode)
      resetCrypto = generateId.__set__('crypto', crypto)
    })

    afterEach(() => {
      resetUrlEncode()
      resetCrypto()
    })

    it('creates random data', () => {
      generateId()

      expect(crypto.randomBytes).to.have.been.calledOnce()
      expect(crypto.randomBytes).to.have.been.calledWith(18)
    })

    it('creates random data with the passed amount of bytes', () => {
      generateId(3)

      expect(crypto.randomBytes).to.have.been.calledOnce()
      expect(crypto.randomBytes).to.have.been.calledWith(3)
    })

    it('converts the random data to base64', () => {
      generateId()

      expect(bytes.toString).to.have.been.calledOnce()
      expect(bytes.toString).to.have.been.calledWith('base64')
    })

    it('url encodes the data', () => {
      expect(generateId()).to.be.eql(randomUrlEncoded)

      expect(urlEncode).to.have.been.calledOnce()
      expect(urlEncode).to.have.been.calledWith(randomBase64)
    })
  })

  describe('urlEncode', () => {
    let urlEncode

    beforeEach(() => {
      urlEncode = generateId.__get__('urlEncode')
    })

    it('strips off trailing equals signs', () => {
      expect(urlEncode('asf8asuf98uas9f8u===')).to.be.eql('asf8asuf98uas9f8u')
    })

    it('converts + to -', () => {
      expect(urlEncode('asdf+asdf+asdf')).to.be.eql('asdf-asdf-asdf')
    })

    it('converts / to _', () => {
      expect(urlEncode('asdf/asdf/asdf')).to.be.eql('asdf_asdf_asdf')
    })

    it('converts them all together', () => {
      expect(urlEncode('asdf/asdf+asdf/asdf+asdf==')).to.be.eql('asdf_asdf-asdf_asdf-asdf')
    })
  })
})
