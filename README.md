# Kompression

[![npm](https://img.shields.io/npm/v/kompression.svg)](https://npm.im/kompression)
[![Build Status](https://dev.azure.com/me0499/kompresssion/_apis/build/status/tuananh.kompression?branchName=develop)](https://dev.azure.com/me0499/kompresssion/_build/latest?definitionId=2&branchName=develop)

This is a fork of [koa-compress](https://github.com/koajs/compress) with support for brotli compression.

Because `zlib` and `iltorb` options doesn't have much in common so including support for brotli
would be a breaking change.

I'm trimming down the available options in this package down to just `filter` and `threshold`.

## Example

```js
const compress = require('kompression')
const Koa = require('koa')

const app = new Koa()
app.use(
    compress({
        filter: function(content_type) {
            return /text/i.test(content_type)
        },
        threshold: 2048
    })
)
```

## Options

### filter

An optional function that checks the response content type to decide whether to compress.
By default, it uses [compressible](https://github.com/expressjs/compressible).

### threshold

Minimum response size in bytes to compress.
Default `1024` bytes or `1kb`.

## Manually turning compression on and off

You can always enable compression by setting `this.compress = true`.
You can always disable compression by setting `this.compress = false`.
This bypasses the filter check.

```js
app.use((ctx, next) => {
    ctx.compress = true
    ctx.body = fs.createReadStream(file)
})
```
