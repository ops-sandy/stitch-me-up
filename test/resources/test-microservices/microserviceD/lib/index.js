'use strict'

const app = require('koa')()
const router = require('koa-router')()
const request = require('request-promise')

router.get('/service-d', function* (next) {
  this.body = '(local-service-d)'
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000)

console.log('microserviceD listening on 3000')
