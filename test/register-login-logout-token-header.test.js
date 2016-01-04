'use strict'

var Assert = require('assert')
var agent

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var suite = lab.suite
var test = lab.test
var before = lab.before

var Util = require('./util.js')

var token

suite('register-login-logout header token suite tests ', function () {
  before({}, function (done) {
    Util.init({}, function (err, agentData, si) {
      Assert.ok(!err)
      agent = agentData
      si.use('auth-token-header', {tokenkey: 'x-auth-token'})

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
        Assert(!res.body.user, 'User in response')
        Assert(!res.body.login, 'Login in response')
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
        token = Util.checkHeader(res)
        done(err)
      })
  })

  test('verify token exists after register', function (done) {
    Assert(token)
    done()
  })

  test('auth/user after register', function (done) {
    agent
      .get('/auth/user')
      .set('x-auth-token', token)
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
      .set('x-auth-token', token)
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
        token = Util.checkHeader(res)
        done(err)
      })
  })

  test('verify token exists after login', function (done) {
    Assert(token)
    done()
  })

  test('auth/user with login test', function (done) {
    agent
      .get('/auth/user')
      .set('x-auth-token', token)
      .expect(200)
      .end(function (err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(res.body.user, 'No user in response')
        Assert(res.body.login, 'No login in response')
        done(err)
      })
  })
})
