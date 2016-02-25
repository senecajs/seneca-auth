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


suite('Hapi register-changepassword suite tests ', function () {
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

  test('auth/change_password test', function (done) {
    var url = '/auth/change_password'

    server.inject({
      url: url,
      method: 'POST',
      payload: {password: 'uu1', repeat: 'uu1'},
      headers: {cookie: 'seneca-login=' + cookie}
    }, function (res) {
      console.log(res.payload)
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(JSON.parse(res.payload).user)

      done()
    })
  })

  test('auth/login test', function (done) {
    var url = '/auth/login'

    server.inject({
      url: url,
      method: 'POST',
      payload: {password: 'uu1', nick: 'u1', name: 'nu1', email: 'u1@example.com'}
    }, function (res) {
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(JSON.parse(res.payload).user)
      Assert(JSON.parse(res.payload).login)

      cookie = Util.checkCookie(res)

      done()
    })
  })
})
