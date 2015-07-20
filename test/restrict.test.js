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
  before({}, function(done){
    util.init(function(err, agentData){
      agent = agentData
      done()
    })
  })

  test('api/service test without user login', function(done) {
    agent
      .get('/api/service')
      .expect(401)
      .end(function (err, res){
        util.log(res)
        assert(!res.body.ok, 'OK response')
        done(err)
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

  test('verify cookie exists after register', function(done) {
    assert(cookie)
    done()
  })

  test('api/service test with user login', function(done) {
    agent
      .get('/api/service')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res){
        util.log(res)
        assert(res.body.ok, 'OK response')
        assert(res.body.test, 'Test OK response')
        done(err)
      })
  })
})



