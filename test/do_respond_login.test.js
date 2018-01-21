'use strict'

var Assert = require('assert')
var agent

var Lab = require('lab')
var lab = (exports.lab = Lab.script())
var suite = lab.suite
var test = lab.test
var before = lab.before

var Util = require('./util.js')

var options = {
  redirect: {
    login: {
      always: true,
      fail: '/fail',
      win: '/win'
    },
    register: {
      always: true,
      fail: '/register_fail',
      win: '/register_win'
    }
  }
}

suite('register-login-logout suite tests ', function() {
  before({}, function(done) {
    Util.init(options, function(err, agentData) {
      Assert.ok(!err)
      agent = agentData

      done()
    })
  })

  test('redirect auth/login fail test', function(done) {
    agent
      .post('/auth/login')
      .send({ nick: 'u1', password: 'u1' })
      .expect(301)
      .end(function(err, res) {
        Util.log(res)
        Assert(
          options.redirect.login.fail,
          res.header.location,
          'Redirect to fail'
        )
        done(err)
      })
  })

  test('auth/register win test', function(done) {
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
        Assert(
          options.redirect.register.win,
          res.header.location,
          'Redirect to win'
        )
        Util.checkCookie(res)
        done(err)
      })
  })

  test('auth/register fail test', function(done) {
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
        Assert(
          options.redirect.register.fail,
          res.header.location,
          'Redirect to fail'
        )
        done(err)
      })
  })

  test('redirect auth/login win test', function(done) {
    agent
      .post('/auth/login')
      .send({ nick: 'u1', password: 'u1' })
      .expect(301)
      .end(function(err, res) {
        Util.log(res)
        Assert(
          options.redirect.login.win,
          res.header.location,
          'Redirect to fail'
        )
        done(err)
      })
  })
})
