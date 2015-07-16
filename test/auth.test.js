"use strict";

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var assert = require('assert')
var request = require('supertest')
var agent
var suite = lab.suite;
var test = lab.test;
var before = lab.before;
var after = lab.after;

var express = require('express')
var cookieparser = require('cookie-parser')
var bodyparser   = require('body-parser')
var session      = require('express-session')

var seneca = require('seneca')(/*{log: 'print'}*/)
seneca.use( 'user' )
seneca.use( require('..'), {secure:true} )
seneca.use('seneca-local-auth', {})

var app
var cookie

function initServer(cb){
  seneca.ready(function(err){
    if( err ) return process.exit( !console.error(err) );

    seneca.act({role:'user', cmd:'register', nick:'u1',name:'nu1',email:'u1@example.com',password:'u1',active:true}, function(err,out){})

    var web = seneca.export('web')

    app = express()
    app.use( cookieparser() )
    app.use( bodyparser.json() )
    app.use( session({secret:'seneca', resave: true, saveUninitialized: true }) )

    app.use( web )
    agent = request(app)
    cb()
  })
}

suite('register/login/logout suite: ', function() {
  var me = this
  before({}, function(done){
    initServer(done)
  })

  test('auth/instance with no login test', function(done) {
    agent
      .get('/auth/instance')
      .expect(200)
      .end(function (err, res){
        log(res)
        assert(!res.body.ok)
        done(err)
      })
  })

  test('auth/login test', function(done) {
    agent
      .post('/auth/login')
      .send({ nick: 'u1', password: 'u1' })
      .expect(200)
      .expect(checkCookie)
      .end(function (err, res){
        log(res)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        done(err)
      })
  })

  test('verify cookie exists', function(done) {
    assert(cookie)
    done()
  })

  test('auth/instance with login test', function(done) {
    agent
      .get('/auth/instance')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res){
        log(res)
        assert(res.body.ok)
        assert(res.body.ok, 'Not OK')
        assert(res.body.user, 'No user in response')
        assert(res.body.login, 'No login in response')
        done(err)
      })
  })
  test('auth/logout test', function(done) {
    agent
      .post('/auth/logout')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res){
        log(res)
        assert(res.body.ok)
        done(err)
      })
  })
  test('auth/instance with no login test', function(done) {
    agent
      .get('/auth/instance')
      .set('Cookie', ['seneca-login=' + cookie])
      .expect(200)
      .end(function (err, res){
        log(res)
        assert(!res.body.ok)
        assert(!res.body.user, 'User in response')
        assert(!res.body.login, 'Login in response')
        done(err)
      })
  })
})


function checkCookie(res) {
  for (var i in res.header['set-cookie']){
    if (res.header['set-cookie'][i].indexOf('seneca-login') === 0){
      cookie = res.header['set-cookie'][i].match(/seneca-login=(.*); path/)[1]
      return
    }
  }
  throw  new Error("missing seneca-login cookie")
}

function log(res){
  console.log('\n****************************************')
  console.log('REQUEST URL : ', JSON.stringify(res.req.path))
  console.log('REQUEST     : ', JSON.stringify(res))
  console.log('STATUS      : ', JSON.stringify(res.status))
  console.log('RESPONSE    : ', JSON.stringify(res.text))
  console.log('****************************************')
}
