# Kompression

<!-- [![Build Status](https://travis-ci.org/koajs/compress.png)](https://travis-ci.org/koajs/compress) -->
<!-- [![Greenkeeper badge](https://badges.greenkeeper.io/koajs/compress.svg)](https://greenkeeper.io/) -->

This is a fork of [koa-compress](https://github.com/koajs/compress) with support for brotli compression.

Because options for `zlib` and `iltorb` are not anything in common so including support for brotli
would be a breaking change.

I'm trimming down the available options in this package down to just `filter` and `threshold`.

## Example

```js
var compress = require('kompression')
var Koa = require('koa')

var app = new Koa()
app.use(compress({
  filter: function (content_type) {
    return /text/i.test(content_type)
  },
  threshold: 2048
}))
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
