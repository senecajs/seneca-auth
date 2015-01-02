"use strict";

var assert = require('assert')
var seneca = require('seneca')
var Cookies = require('cookies')

var si = seneca()
si.use( 'user' )
si.use( require('..'),{secure:true} )

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

  it('use secure option', function(cb) {

    var res = {}
    var req = {}

    si.cookies = { set: function(tokenkey,id,options){
      assert.ok(options.secure)

      cb()
    }}
    res.seneca = si
    req.seneca = si
    authact.login({user:{nick:'u1',name:'u1n',password:'u1p'},auto:true,req$:req,res$:res},function(err,out){
      if( err ) return cb(err);


    })

  })
})
