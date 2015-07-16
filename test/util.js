var assert = require('assert')

exports.init = function(cb){
  var agent
  var request = require('supertest')
  var express = require('express')
  var cookieparser = require('cookie-parser')
  var bodyparser   = require('body-parser')
  var session      = require('express-session')
  var seneca = require('seneca')

  var si

  si = seneca(/*{log: 'print'}*/)
  si.use( 'user' )
  si.use( require('..'), {secure:true} )
  si.use( 'seneca-local-auth', {} )

  si.ready(function(err){
    if( err ) return process.exit( !console.error(err) );

    var web = si.export('web')

    var app = express()
    app.use( cookieparser() )
    app.use( bodyparser.json() )
    app.use( session({secret:'si', resave: true, saveUninitialized: true }) )

    app.use( web )
    agent = request(app)
    cb(null, agent, si)
  })
}

exports.log = function (res){
  // comment next line for logging of req/responses
  return
  console.log('\n****************************************')
  console.log('REQUEST URL : ', JSON.stringify(res.req.path))
  console.log('REQUEST     : ', JSON.stringify(res))
  console.log('STATUS      : ', JSON.stringify(res.status))
  console.log('RESPONSE    : ', JSON.stringify(res.text))
  console.log('****************************************')
}

exports.checkCookie = function(res) {
  for (var i in res.header['set-cookie']){
    if (res.header['set-cookie'][i].indexOf('seneca-login') === 0){
      return res.header['set-cookie'][i].match(/seneca-login=(.*); path/)[1]
    }
  }
  throw new Error("missing seneca-login cookie")
}

exports.checkHeader = function(res) {
  assert(res.header['x-auth-token'])
  return res.header['x-auth-token']
}

