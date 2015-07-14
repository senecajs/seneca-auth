"use strict";

var assert = require('assert')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

var seneca = require('seneca')(/*{log: 'print'}*/)
seneca.use( 'user' )
seneca.use( require('..'), {secure:true} )

seneca.cookies = {
  set: function(tokenkey, id){
    console.log('Set cookie ' + tokenkey + ":" + id)
    seneca.cookies[tokenkey] = id
  },
  get: function(tokenkey){
    console.log('Get cookie ' + tokenkey)
    return seneca.cookies[tokenkey]
  }
}
var res = {}
var req = {}
res.seneca = seneca
req.seneca = seneca
req.headers = {}
req.query = {}


var suite = lab.suite;
var test = lab.test;
var before = lab.before;
var after = lab.after;

suite('register/logout suite: ', function() {
  test('auth register test', function(done) {
    seneca.act({role:'auth', cmd: 'register', data:{nick:'u1',name:'u1n',password:'u1p'}, req$: req, res$: res},function(err,out){
      if( err ) return cb(err);

      assert.ok(out.ok, 'Register not OK')
      assert.ok(out.user, 'User not registered')
      assert.ok(out.login, 'Login not done after register')
      done()
    })
  })
  test('auth logout', function(done) {
    seneca.act({role:'auth', cmd: 'logout', req$: req, res$: res},function(err,out){
      assert.ok(!out.ok, 'Login not OK')
      done()
    })
  })
})
