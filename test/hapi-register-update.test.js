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

var Util = require('./hapi-util.js')

suite('Hapi register-update-user suite tests ', function () {
  var server
  var user = {nick: 'u1', name: 'nu1', email: 'u1@example.com', password: 'u1', active: true}
  var changed_user = {nick: 'u1', name: 'nu2', email: 'u1@example.com'}
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

  test('auth/update test', function (done) {
    var url = '/auth/update_user'

    server.inject({
      url: url,
      method: 'POST',
      payload: changed_user,
      headers: {cookie: 'seneca-login=' + cookie}
    }, function (res) {
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(JSON.parse(res.payload).user)
      Assert.equal(changed_user.name, JSON.parse(res.payload).user.name)

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
      Assert.equal(200, res.statusCode, 'Invalid status')
      Assert(JSON.parse(res.payload).ok, 'ok value')
      Assert(JSON.parse(res.payload).user, 'user value')
      Assert(JSON.parse(res.payload).login, 'login value')
      Assert.equal(changed_user.name, JSON.parse(res.payload).user.name, 'user name')

      cookie = Util.checkCookie(res)

      done()
    })
  })
})
