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
  before({}, function (done) {
    Util.init({}, function (err, agentData) {
      Assert.ok(!err)
      agent = agentData

      done()
    })
  })

  test('auth/user with no login test', function (done) {
    agent
      .get('/auth/user')
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Response has OK=true')
        Assert(!res.body.user, 'User present')
        Assert(!res.body.login, 'Login present')
        done(err)
      })
  })

  test('auth/register test', function (done) {
    agent
      .post('/auth/register')
      .send({nick: 'u1', name: 'nu1', email: 'u1@example.com', password: 'u1', active: true})
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(res.body.user, 'No user in response')
        Assert(res.body.login, 'No login in response')
        cookie = Util.checkCookie(res)
        done(err)
      })
  })

  test('verify cookie exists after register', function (done) {
    Assert(cookie)
    done()
  })

  test('auth/user after register', function (done) {
    agent
      .get('/auth/user')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(res.body.user, 'No user in response')
        Assert(res.body.login, 'No login in response')
        done(err)
      })
  })

  test('auth/logout test', function (done) {
    agent
      .post('/auth/logout')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok)
        Assert(!res.body.user, 'User in response')
        Assert(!res.body.login, 'Login in response')
        done(err)
      })
  })

  test('auth/login test', function (done) {
    agent
      .post('/auth/login')
      .send({nick: 'u1', password: 'u1'})
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(res.body.user, 'No user in response')
        Assert(res.body.login, 'No login in response')
        cookie = Util.checkCookie(res)
        done(err)
      })
  })

  test('verify cookie exists after login', function (done) {
    Assert(cookie)
    done()
  })

  test('auth/user with login test', function (done) {
    agent
      .get('/auth/user')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(res.body.user, 'No user in response')
        Assert(res.body.login, 'No login in response')
        done(err)
      })
  })

  test('auth/logout test', function (done) {
    agent
      .post('/auth/logout')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok)
        done(err)
      })
  })

  test('auth/user with no login test', function (done) {
    agent
      .get('/auth/user')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(!res.body.user, 'User in response')
        Assert(!res.body.login, 'Login in response')
        done(err)
      })
  })
})
