const compress = require('..')
const Koa = require('koa')
const fs = require('fs')
const path = require('path')

const app = new Koa()
app.use(compress())

app.use((ctx, next) => {
    ctx.type = 'text/plain'
    ctx.body = fs.createReadStream(path.join(__dirname, '../package.json'))
})

app.listen(3000, () => console.log('Example app listening on port 3000!'))
