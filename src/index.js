/**
 * Module dependencies.
 */

const compressible = require('compressible')
const isJSON = require('koa-is-json')
const status = require('statuses')
const Stream = require('stream')
const bytes = require('bytes')
const zlib = require('zlib')
const brotli = require('zlib').createBrotliCompress
    ? require('zlib').createBrotliCompress
    : require('iltorb').compressStream

/**
 * Encoding methods supported.
 */

const encodingMethods = {
    gzip: zlib.createGzip,
    deflate: zlib.createDeflate,
    br: brotli
}

/**
 * Compress middleware.
 *
 * @param {Object} [options]
 * @return {Function}
 * @api public
 */

module.exports = (options = {}) => {
    const { filter = compressible } = options
    let { threshold = 1024 } = options
    if (typeof threshold === 'string') threshold = bytes(threshold)

    return async (ctx, next) => {
        ctx.vary('Accept-Encoding')

        await next()

        let { body } = ctx
        if (!body) return
        if (ctx.compress === false) return
        if (ctx.request.method === 'HEAD') return
        if (status.empty[ctx.response.status]) return
        if (ctx.response.get('Content-Encoding')) return

        // forced compression or implied
        if (!(ctx.compress === true || filter(ctx.response.type))) return

        // identity
        let encoding = null
        if (ctx.acceptsEncodings('br') === 'br') {
            encoding = 'br'
        } else if (ctx.acceptsEncodings('gzip') === 'gzip') {
            encoding = 'gzip'
        } else if (ctx.acceptsEncodings('deflate') === 'deflate') {
            encoding = 'deflate'
        } else {
            encoding = ctx.acceptsEncodings('identity')
        }
        if (!encoding)
            ctx.throw(406, 'supported encodings: gzip, deflate, identity, br')
        if (encoding === 'identity') return

        // json
        if (isJSON(body)) body = ctx.body = JSON.stringify(body)

        // threshold
        if (threshold && ctx.response.length < threshold) return

        ctx.set('Content-Encoding', encoding)
        ctx.res.removeHeader('Content-Length')

        // since brotli and zlib options are so different
        // i'm trimming down opts to just threshold
        const stream = (ctx.body = encodingMethods[encoding](options))

        if (body instanceof Stream) {
            body.pipe(stream)
        } else {
            stream.end(body)
        }
    }
}
