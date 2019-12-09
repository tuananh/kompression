const request = require('supertest')
const Koa = require('koa')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const iltorb = require('iltorb')
const compress = require('../src')

require('should-http')

describe('Compress', () => {
    const buffer = crypto.randomBytes(1024)
    const string = buffer.toString('hex')

    function sendString(ctx, next) {
        ctx.body = string
    }

    function sendBuffer(ctx, next) {
        ctx.compress = true
        ctx.body = buffer
    }

    it('should compress strings', done => {
        const app = new Koa()

        app.use(compress())
        app.use(sendString)

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Transfer-Encoding', 'chunked')
                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-length')
                res.text.should.equal(string)

                done()
            })
    })

    it('should not compress strings below threshold', done => {
        const app = new Koa()

        app.use(
            compress({
                threshold: '1mb'
            })
        )
        app.use(sendString)

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Content-Length', '2048')
                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-encoding')
                res.headers.should.not.have.property('transfer-encoding')
                res.text.should.equal(string)

                done()
            })
    })

    it('should compress JSON body', done => {
        const app = new Koa()
        const jsonBody = { status: 200, message: 'ok', data: string }

        app.use(compress())
        app.use((ctx, next) => {
            ctx.body = jsonBody
        })

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Transfer-Encoding', 'chunked')
                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-length')
                res.text.should.equal(JSON.stringify(jsonBody))

                done()
            })
    })

    it('should not compress JSON body below threshold', done => {
        const app = new Koa()
        const jsonBody = { status: 200, message: 'ok' }

        app.use(compress())
        app.use((ctx, next) => {
            ctx.body = jsonBody
        })

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-encoding')
                res.headers.should.not.have.property('transfer-encoding')
                res.text.should.equal(JSON.stringify(jsonBody))

                done()
            })
    })

    it('should compress buffers', done => {
        const app = new Koa()

        app.use(compress())
        app.use(sendBuffer)

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Transfer-Encoding', 'chunked')
                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-length')

                done()
            })
    })

    it('should compress streams', done => {
        const app = new Koa()

        app.use(compress())

        app.use((ctx, next) => {
            ctx.type = 'application/javascript'
            ctx.body = fs.createReadStream(path.join(__dirname, 'index.js'))
        })

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Content-Encoding', 'gzip')
                res.should.have.header('Transfer-Encoding', 'chunked')
                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-length')

                done()
            })
    })

    it('should compress when ctx.compress === true', done => {
        const app = new Koa()

        app.use(compress())
        app.use(sendBuffer)

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Content-Encoding', 'gzip')
                res.should.have.header('Transfer-Encoding', 'chunked')
                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-length')

                done()
            })
    })

    it('should not compress when ctx.compress === false', done => {
        const app = new Koa()

        app.use(compress())
        app.use((ctx, next) => {
            ctx.compress = false
            ctx.body = buffer
        })

        request(app.listen())
            .get('/')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Content-Length', '1024')
                res.should.have.header('Vary', 'Accept-Encoding')
                res.headers.should.not.have.property('content-encoding')
                res.headers.should.not.have.property('transfer-encoding')

                done()
            })
    })

    it('should not compress HEAD requests', done => {
        const app = new Koa()

        app.use(compress())
        app.use(sendString)

        request(app.listen())
            .head('/')
            .expect(200, (err, res) => {
                if (err) return done(err)

                res.headers.should.not.have.property('content-encoding')

                done()
            })
    })

    it('should not crash even if accept-encoding: sdch', done => {
        const app = new Koa()

        app.use(compress())
        app.use(sendBuffer)

        request(app.listen())
            .get('/')
            .set('Accept-Encoding', 'sdch, gzip, deflate')
            .expect(200, done)
    })

    it('should not crash if no accept-encoding is sent', done => {
        const app = new Koa()

        app.use(compress())
        app.use(sendBuffer)

        request(app.listen())
            .get('/')
            .expect(200, done)
    })

    it('should not crash if a type does not pass the filter', done => {
        const app = new Koa()

        app.use(compress())
        app.use(ctx => {
            ctx.type = 'image/png'
            ctx.body = Buffer.alloc(2048)
        })

        request(app.listen())
            .get('/')
            .expect(200, done)
    })

    it('should not compress when transfer-encoding is already set', done => {
        const app = new Koa()

        app.use(
            compress({
                threshold: 0
            })
        )
        app.use(ctx => {
            ctx.set('Content-Encoding', 'identity')
            ctx.type = 'text'
            ctx.body = 'asdf'
        })

        request(app.listen())
            .get('/')
            .expect('asdf', done)
    })

    it('should compress with brotli when encoding is br', done => {
        const app = new Koa()

        app.use(compress())

        app.use((ctx, next) => {
            ctx.type = 'text/plain'
            ctx.body = fs.createReadStream(
                path.join(__dirname, '../package.json')
            )
        })

        request(app.listen())
            .get('/')
            .set('Accept-Encoding', 'br')
            .expect(200)
            .buffer()
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Content-Encoding', 'br')
                const packageJson = fs.readFileSync(
                    path.join(__dirname, '../package.json')
                )
                const payload = iltorb.compressSync(packageJson).toString()
                res.text.should.equal(payload)

                done()
            })
    })

    it('should prefer brotli over gzip as encoding method', done => {
        const app = new Koa()

        app.use(
            compress({
                threshold: 0
            })
        )

        app.use((ctx, next) => {
            ctx.type = 'text/plain'
            ctx.body = 'asdf'
        })

        request(app.listen())
            .get('/')
            .set('Accept-Encoding', 'gzip, deflate, br')
            .expect(200)
            .buffer()
            .end((err, res) => {
                if (err) return done(err)

                res.should.have.header('Content-Encoding', 'br')

                done()
            })
    })
})
