"use strict";

var assert = require('assert')
var seneca = require('seneca')

var si = seneca()
si.use( 'user' )
si.use( require('..') )

var useract = si.pin({role:'user',cmd:'*'})
var authact = si.pin({role:'auth',cmd:'*'})


describe('auth', function() {
  it('happy', function(cb) {

    authact.register({data:{nick:'u1',name:'u1n',password:'u1p'}},function(err,out){
      if( err ) return cb(err);
      
      assert.ok(out.ok)
      assert.ok(out.user)
      assert.ok(out.login)
      cb()
    })

  })
})
