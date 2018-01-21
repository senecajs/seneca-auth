'use strict'

var Assert = require('assert')
var agent

var Lab = require('lab')
var lab = (exports.lab = Lab.script())
var suite = lab.suite
var test = lab.test
var before = lab.before

var Util = require('./util.js')

var cookie

var options = {
  redirect: {
    always: true,
    register: {
      win: '/register_OK',
      fail: '/register_failed'
    },
    logout: {
      win: '/logout_OK',
      fail: '/logout_failed'
    },
    login: {
      win: '/login_OK',
      fail: '/login_failed'
    }
  }
}

var user = {
  nick: 'u1',
  name: 'nu1',
  email: 'u1@example.com',
  password: 'u1',
  active: true
}

suite('register-login-logout with redirect suite tests ', function() {
  before({}, function(done) {
    Util.init(options, function(err, agentData) {
      Assert.ok(!err)
      agent = agentData

      done()
    })
  })

  test('auth/user with no login test', function(done) {
    agent
      .get('/auth/user')
      .expect(200)
      .end(function(err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Response has OK=true')
        Assert(!res.body.user, 'User present')
        Assert(!res.body.login, 'Login present')
        done(err)
      })
  })

  test('auth/register test', function(done) {
    agent
      .post('/auth/register')
      .send(user)
      .expect(301)
      .end(function(err, res) {
        Util.log(res)
        Assert.equal(
          options.redirect.register.win,
          res.header.location,
          'Location'
        )
        cookie = Util.checkCookie(res)
        done(err)
      })
  })

  test('auth/register test', function(done) {
    agent
      .post('/auth/register')
      .send({
        nick: 'u1',
        name: 'nu1',
        email: 'u1@example.com',
        password: 'u1',
        active: true
      })
      .expect(301)
      .end(function(err, res) {
        Util.log(res)
        Assert.equal(
          options.redirect.register.fail,
          res.header.location,
          'Location'
        )
        done(err)
      })
  })

  test('auth/logout test', function(done) {
    agent
      .post('/auth/logout')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(301)
      .end(function(err, res) {
        Util.log(res)
        Assert.equal(
          options.redirect.logout.win,
          res.header.location,
          'Location'
        )
        done(err)
      })
  })

  test('auth/login test', function(done) {
    agent
      .post('/auth/login')
      .send({ nick: 'u1', password: 'u1' })
      .expect(301)
      .end(function(err, res) {
        Util.log(res)
        Assert.equal(
          options.redirect.login.win,
          res.header.location,
          'Location'
        )
        cookie = Util.checkCookie(res)
        done(err)
      })
  })

  test('verify cookie exists after login', function(done) {
    Assert(cookie)
    done()
  })

  test('auth/user with login test', function(done) {
    agent
      .get('/auth/user')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function(err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(res.body.user, 'No user in response')
        Assert(res.body.login, 'No login in response')
        done(err)
      })
  })
})
