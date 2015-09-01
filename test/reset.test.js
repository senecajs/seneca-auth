"use strict";

var assert = require( 'assert' )
var agent

var Lab = require( 'lab' )
var lab = exports.lab = Lab.script()
var suite = lab.suite;
var test = lab.test;
var before = lab.before;
var after = lab.after;

var util = require( './util.js' )

var cookie
var reset
var user = {nick: 'u1', name: 'nu1', email: 'u1@example.com', password: 'u1', active: true}
var newPwd = 'uuu1'

suite( 'reset suite tests ', function() {
  before( {}, function( done ) {
    util.init( {}, function( err, agentData ) {
      agent = agentData
      done()
    } )
  } )

  test( 'auth/register test', function( done ) {
    agent
      .post( '/auth/register' )
      .send( user )
      .expect( 200 )
      .end( function( err, res ) {
        util.log( res )
        assert( res.body.ok, 'Not OK' )
        assert( res.body.user, 'No user in response' )
        assert( res.body.login, 'No login in response' )
        cookie = util.checkCookie( res )
        done( err )
      } )
  } )

  test( 'verify cookie exists after register', function( done ) {
    assert( cookie )
    done()
  } )

  test( 'auth/create_reset', function( done ) {
    agent
      .post( '/auth/create_reset' )
      .send( {nick: user.nick} )
      .expect( 200 )
      .end( function( err, res ) {
        util.log( res )
        assert( res.body.ok, 'Not OK' )
        assert( res.body.user, 'No user in response' )
        assert( res.body.reset, 'No reset in response' )
        reset = res.body.reset
        done( err )
      } )
  } )

  test( 'auth/load_reset', function( done ) {
    agent
      .post( '/auth/load_reset' )
      .send( {token: reset.token} )
      .expect( 200 )
      .end( function( err, res ) {
        util.log( res )
        assert( res.body.ok, 'Not OK' )
        assert( res.body.nick, 'No nick in response' )
        done( err )
      } )
  } )

  test( 'auth/execute_reset', function( done ) {
    agent
      .post( '/auth/execute_reset' )
      .send( {token: reset.token, password: newPwd, repeat: newPwd} )
      .expect( 200 )
      .end( function( err, res ) {
        util.log( res )
        assert( res.body.ok, 'Not OK' )
        done( err )
      } )
  } )

} )



