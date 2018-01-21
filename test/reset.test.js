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
// var reset
var user = {
  nick: 'u1',
  name: 'nu1',
  email: 'u1@example.com',
  password: 'u1',
  active: true
}
// var newPwd = 'uuu1'

suite('reset suite tests ', function() {
  before({}, function(done) {
    Util.init({}, function(err, agentData) {
      Assert.ok(!err)

      agent = agentData
      done()
    })
  })

  test('auth/register test', function(done) {
    agent
      .post('/auth/register')
      .send(user)
      .expect(200)
      .end(function(err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        Assert(res.body.user, 'No user in response')
        Assert(res.body.login, 'No login in response')
        cookie = Util.checkCookie(res)
        done(err)
      })
  })

  test('verify cookie exists after register', function(done) {
    Assert(cookie)
    done()
  })

  test('auth/create_reset', function(done) {
    agent
      .post('/auth/create_reset')
      .send({ nick: user.nick })
      .expect(200)
      .end(function(err, res) {
        Util.log(res)
        Assert(res.body.ok, 'Not OK')
        done(err)
      })
  })

  // need to see how we can test reset
  // test('auth/load_reset', function (done) {
  //  agent
  //    .post('/auth/load_reset')
  //    .send({token: reset.id})
  //    .expect(200)
  //    .end(function (err, res) {
  //      Util.log(res)
  //      Assert(res.body.ok, 'Not OK')
  //      Assert(res.body.nick, 'No nick in response')
  //      done(err)
  //    })
  // })

  // test( 'auth/execute_reset', function( done ) {
  //  agent
  //    .post( '/auth/execute_reset' )
  //    .send( {token: reset.id, password: newPwd, repeat: newPwd} )
  //    .expect( 200 )
  //    .end( function( err, res ) {
  //      util.log( res )
  //      assert( res.body.ok, 'Not OK' )
  //      done( err )
  //    } )
  // } )
})
