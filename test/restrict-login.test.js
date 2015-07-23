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

var cookie
var user = {nick:'u1',name:'nu1',email:'u1@example.com',password:'u1',active:true}

suite('restrict suite tests ', function() {
  var seneca
  before({}, function(done){
    util.init(function(err, agentData, si){
      agent = agentData
      seneca = si
      done()
    })
  })

  test('auth/register user', function(done) {
    agent
      .post('/auth/register')
      .send(user)
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        cookie = util.checkCookie(res)
        done(err)
      })
  })

  test('api/login test without any restriction', function(done) {
    agent
      .post('/auth/login')
      .send({nick: user.nick, password: user.password})
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'OK response')
        assert(res.body.user, 'User OK response')
        done(err)
      })
  })

  test('api/login test with restriction - can login', function(done) {
    seneca.add({role: 'auth', restrict: 'login'}, function(args, done){
      done(null, {ok: true})
    })

    agent
      .post('/auth/login')
      .send({nick: user.nick, password: user.password})
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'OK response')
        assert(res.body.user, 'User OK response')
        done(err)
      })
  })

  test('api/login test with restriction - cannot login', function(done) {
    seneca.add({role: 'auth', restrict: 'login'}, function(args, done){
      done(null, {ok: false, why: 'not-allowed'})
    })

    agent
      .post('/auth/login')
      .send({nick: user.nick, password: user.password})
      .expect(401)
      .end(function (err, res){
        util.log(res)
        assert(!res.body.ok, 'OK response')
        assert.equal('not-allowed', res.body.why)
        done(err)
      })
  })


  test('api/login test with external restrict plugin', function(done) {
    seneca.add({role: 'auth', restrict: 'login'}, function(args, done){
      done(null, {ok: false, why: 'not-allowed'})
    })

    agent
      .post('/auth/login')
      .send({nick: user.nick, password: user.password})
      .expect(401)
      .end(function (err, res){
        util.log(res)
        assert(!res.body.ok, 'OK response')
        assert.equal('not-allowed', res.body.why)
        done(err)
      })
  })
})

suite('restrict suite tests ', function() {
  var seneca
  before({}, function(done){
    util.init(function(err, agentData, si){
      agent = agentData
      seneca = si
      seneca.use('auth-restrict-login')
      done()
    })
  })

  test('auth/register user', function(done) {
    agent
      .post('/auth/register')
      .send(user)
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        cookie = util.checkCookie(res)
        done(err)
      })
  })

  test('api/login test with external restrict plugin - login not allowed', function(done) {
    agent
      .post('/auth/login')
      .send({nick: user.nick, password: user.password})
      .expect(401)
      .end(function (err, res){
        util.log(res)
        assert(!res.body.ok, 'OK response')
        assert.equal('not-allowed', res.body.why)
        done(err)
      })
  })

  test('api/login test with external restrict plugin - login allowed', function(done) {
    agent
      .post('/auth/login')
      .send({nick: user.nick, password: user.password})
      .set('Cookie', ['allow_login=' + 1])
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'OK response')
        assert(res.body.user)
        done(err)
      })
  })
})


