"use strict";

var assert = require('assert')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

var http = require('http')
var express = require('express')
var cookieparser = require('cookie-parser')
var bodyparser   = require('body-parser')
var session      = require('express-session')
var request = require('request');

var seneca = require('seneca')(/*{log: 'print'}*/)
seneca.use( 'user' )
seneca.use( require('..'), {secure:true} )

var options = {
  port: 3333
}

function initServer(cb){
  seneca.ready(function(err){
    if( err ) return process.exit( !console.error(err) );

    var u = seneca.pin({role:'user',cmd:'*'})

    u.register({nick:'u1',name:'nu1',email:'u1@example.com',password:'u1',active:true}, function(err,out){})
    u.register({nick:'u2',name:'nu2',email:'u2@example.com',password:'u2',active:true})
    u.register({nick:'a1',name:'na1',email:'a1@example.com',password:'a1',active:true,admin:true})

    var web = seneca.export('web')

    var app = express()
    app.use( cookieparser() )
    app.use( bodyparser.json() )
    app.use( session({secret:'seneca', resave: true, saveUninitialized: true }) )

    app.use( web )

    app.use( function( req, res, next ){
      if( 0 == req.url.indexOf('/reset') ||
        0 == req.url.indexOf('/confirm') )
      {
        req.url = '/'
      }

      next()
    })

    var server = http.createServer(app)
    console.log('Listen on ' + options.port)
    server.listen( options.port )
    seneca.log.info('listen',options.port)
    seneca.listen()
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
    sendHTTPRequest('get', {url: '/auth/instance'}, function(err, response, body){
      logResponse(err, response, body)

      assert(body)
      body = JSON.parse(body)
      assert(body.ok)
      assert(body.http$)
      assert.equal(body.http$.status, 200)
      assert.equal(body.user, null)
      assert.equal(body.login, null)

      done()
    })
  })
})

function logResponse(err, response, body){
  console.log('**************')
  console.log('ERR: ' + err)
  console.log('RESPONSE: ' + JSON.stringify(response))
  console.log('BODY: ' + body)
  console.log('**************')
}

function sendHTTPRequest(method, req, cb){
  console.log('URL: ' + 'http://localhost:' + options.port + req.url)
  request(
    'http://localhost:' + options.port + req.url,
    cb
  );
}
