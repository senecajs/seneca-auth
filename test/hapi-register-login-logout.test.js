'use strict'

// DO NOT RUN HAPI TESTS FOR NODE LESS THAN 4.0.0
if (process.version < 'v4.0.0') {
  return
}

var Assert = require('assert')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var suite = lab.suite
var test = lab.test
var before = lab.before
var after = lab.after

var Util = require('./hapi-util')

suite('Hapi register-login-logout suite tests ', function () {
  var server
  var user = {nick: 'u1', name: 'nu1', email: 'u1@example.com', password: 'u1', active: true}
  var cookie

  before({}, function (done) {
    Util.init({}, function (err, srv) {
      Assert.ok(!err)

      server = srv
      done()
    })
  })

  after({}, function (done) {
    server.seneca.close()
    done()
  })

  test('auth/register test', function (done) {
    var url = '/auth/register'

    server.inject({
      url: url,
      method: 'POST',
      payload: user
    }, function (res) {
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(JSON.parse(res.payload).user)
      Assert(JSON.parse(res.payload).login)

      cookie = Util.checkCookie(res)

      done()
    })
  })

  test('auth/logout test', function (done) {
    var url = '/auth/logout'

    server.inject({
      url: url,
      method: 'GET',
      headers: {cookie: 'seneca-login=' + cookie}
    }, function (res) {
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(!JSON.parse(res.payload).user)
      Assert(!JSON.parse(res.payload).login)

      done()
    })
  })

  test('auth/login test', function (done) {
    var url = '/auth/login'

    server.inject({
      url: url,
      method: 'POST',
      payload: user
    }, function (res) {
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(JSON.parse(res.payload).user)
      Assert(JSON.parse(res.payload).login)

      cookie = Util.checkCookie(res)

      done()
    })
  })

  test('auth/user after register', function (done) {
    var url = '/auth/user'

    server.inject({
      url: url,
      method: 'POST',
      headers: {cookie: 'seneca-login=' + cookie}
    }, function (res) {
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(JSON.parse(res.payload).user)
      done()
    })
  })
})
