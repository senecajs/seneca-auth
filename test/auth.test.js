"use strict";

var assert = require('assert')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

var express = require('express')
var cookieparser = require('cookie-parser')
var bodyparser   = require('body-parser')
var session      = require('express-session')

var seneca = require('seneca')(/*{log: 'print'}*/)
seneca.use( 'user' )
seneca.use( require('..'), {secure:true} )
var app

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
    cb()
  })
}
var suite = lab.suite;
var test = lab.test;
var before = lab.before;
var after = lab.after;

suite('register/logout suite: ', function() {
  before({}, function(done){
    initServer(done)
  })
  test('auth login test', function(done) {

    var request = require('supertest')
    request(app)
      .get('/auth/instance')
      .expect(200, {user: null, login: null, ok: true, 'http$': { status: 200 }})
      .end(function (err, res){
        log(res)
        done(err)
      })
  })
})


function log(res){
  console.log('****************************************')
  console.log('STATUS  : ', JSON.stringify(res))
  console.log('STATUS  : ', JSON.stringify(res.status))
  console.log('RESPONSE: ', JSON.stringify(res.text))
  console.log('****************************************')
}
