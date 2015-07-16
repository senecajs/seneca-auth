"use strict";

var assert = require('assert')
var agent

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var suite = lab.suite;
var test = lab.test;
var before = lab.before;
var after = lab.after;

var util = require('./util.js')

var token

suite('register-login-logout header token suite tests ', function() {
  before({}, function(done){
    util.init(function(err, agentData, si){
      agent = agentData
      si.use( 'seneca-auth-token-header', {} )
      done()
    })
  })

  test('auth/instance with no login test', function(done) {
    agent
      .get('/auth/instance')
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(!res.body.ok, 'Response has OK=true')
        done(err)
      })
  })

  test('auth/register test', function(done) {
    agent
      .post('/auth/register')
      .send({nick:'u1',name:'nu1',email:'u1@example.com',password:'u1',active:true})
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        token = util.checkHeader(res)
        done(err)
      })
  })

  test('verify token exists after register', function(done) {
    assert(token)
    done()
  })

  test('auth/instance after register', function(done) {
    agent
      .get('/auth/instance')
      .set('seneca-login', token)
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        done(err)
      })
  })

  test('auth/logout test', function(done) {
    agent
      .post('/auth/logout')
      .set('seneca-login', token)
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok)
        done(err)
      })
  })

  test('auth/login test', function(done) {
    agent
      .post('/auth/login')
      .send({ nick: 'u1', password: 'u1' })
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        token = util.checkHeader(res)
        done(err)
      })
  })

  test('verify token exists after login', function(done) {
    assert(token)
    done()
  })

  test('auth/instance with login test', function(done) {
    agent
      .get('/auth/instance')
      .set('seneca-login', token)
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        done(err)
      })
  })
})



