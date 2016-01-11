'use strict'

var Assert = require('assert')
var agent

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var suite = lab.suite
var test = lab.test
var before = lab.before

var Util = require('./util.js')

var cookie

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
      method: 'POST',
      headers: { cookie: cookie }
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

  //test('auth/user after register', function (done) {
  //  agent
  //    .get('/auth/user')
  //    .set('Cookie', ['seneca-login=' + cookie])
  //    .expect(200)
  //    .end(function (err, res) {
  //      Util.log(res)
  //      Assert(res.body.ok, 'Not OK')
  //      Assert(res.body.user, 'No user in response')
  //      Assert(res.body.login, 'No login in response')
  //      done(err)
  //    })
  //})
  //
  //test('auth/logout test', function (done) {
  //  agent
  //    .post('/auth/logout')
  //    .set('Cookie', ['seneca-login=' + cookie])
  //    .expect(200)
  //    .end(function (err, res) {
  //      Util.log(res)
  //      Assert(res.body.ok)
  //      Assert(!res.body.user, 'User in response')
  //      Assert(!res.body.login, 'Login in response')
  //      done(err)
  //    })
  //})
  //

})
