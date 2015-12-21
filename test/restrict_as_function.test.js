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
var user = {nick: 'u1', name: 'nu1', email: 'u1@example.com', password: 'u1', active: true}

suite( 'restricted suite tests ', function() {
  before( {}, function( done ) {
    util.init( {restrict: restrict_fct}, function( err, agentData ) {
      agent = agentData
      done()
    } )
  } )

  //test( 'api/service test without user login', function( done ) {
  //  agent
  //    .get( '/api/service' )
  //    .expect( 401 )
  //    .end( function( err, res ) {
  //      util.log( res )
  //      assert( !res.body.ok, 'OK response' )
  //      assert.equal( 'restricted', res.body.why, "Why should be 'restricted'" )
  //      done( err )
  //    } )
  //} )

  test( 'api/service test without user login', function( done ) {
    agent
      .get( '/api/service2' )
      .expect( 200 )
      .end( function( err, res ) {
        util.log( res )
        assert( res.body.ok, 'OK response' )
        done( err )
      } )
  } )

  function restrict_fct( req, res, done ) {
    if( '/api/service' === req.url ) {
      return done( { ok: false, why: 'restricted', http$: {status: 401} } )
    }
    done()
  }
} )



