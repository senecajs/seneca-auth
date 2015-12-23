var assert = require('assert')
var _ = require('lodash')

exports.init = function (options, cb) {
  var agent
  var request = require('supertest')
  var express = require('express')
  var cookieparser = require('cookie-parser')
  var bodyparser = require('body-parser')
  var session = require('express-session')

  var si = require('seneca')(/* {log: 'print'} */)
  si.use('user')
  si.use(require('..'), _.extend({secure: true, restrict: '/api'}, options || {}))
  si.use('seneca-local-auth', {})

  si.ready(function (err) {
    if (err) {
      return process.exit(!console.error(err))
    }

    var app = express()
    app.use(cookieparser())
    app.use(bodyparser.json())
    app.use(session({secret: 'si', resave: true, saveUninitialized: true}))

    app.use(si.export('web'))
    agent = request(app)

    si.add({role: 'test', cmd: 'service'}, function (args, cb) {
      return cb(null, {ok: true, test: true})
    })
    si.add({role: 'test', cmd: 'service2'}, function (args, cb) {
      return cb(null, {ok: true, test: true})
    })
    si.act({
      role: 'web',
      plugin: 'test',
      use: {
        prefix: '/api',
        pin: {role: 'test', cmd: '*'},
        map: {
          service: {GET: true},
          service2: {GET: true}
        }
      }
    })

    cb(null, agent, si)
  })
}

exports.log = function (res) {
  // uncomment next lines for logging of req/responses
  // console.log('\n****************************************')
  // console.log('REQUEST URL : ', JSON.stringify(res.req.path))
  // console.log('REQUEST     : ', JSON.stringify(res))
  // console.log('STATUS      : ', JSON.stringify(res.status))
  // console.log('RESPONSE    : ', JSON.stringify(res.text))
  // console.log('****************************************')
  return
}

exports.checkCookie = function (res) {
  for (var i in res.header['set-cookie']) {
    if (res.header['set-cookie'][i].indexOf('seneca-login') === 0) {
      return res.header['set-cookie'][i].match(/seneca-login=(.*); path/)[1]
    }
  }
  throw new Error('missing seneca-login cookie')
}

exports.checkHeader = function (res) {
  assert(res.header['x-auth-token'])
  return res.header['x-auth-token']
}
