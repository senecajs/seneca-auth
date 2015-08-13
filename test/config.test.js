"use strict";

var assert = require('assert')

var lab = exports.lab = require('lab').script()
var suite = lab.suite;
var test = lab.test;

process.setMaxListeners(0)

suite('config suite tests ', function() {
  var cfgs = ['service', 'sendemail', 'email']
  for (var i in cfgs){
    var cfg = cfgs[i]
    test('with ' + cfg + ' options test', function(done) {
      var si = require('seneca')({errhandler : errhandler, debug: {undead: true}})
      si.use( 'user' )
      var config = {}
      config[cfg] = {}
      si.use( require('..'), config )

      function errhandler( err ) {
        assert.equal( 'auth: <' + cfg + '> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth', err.msg )
        done()
      }
    })
  }

})



