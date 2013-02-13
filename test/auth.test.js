"use strict";

var assert = require('assert')
var seneca = require('seneca')

var si = seneca()
si.use( 'user' )
si.use( require('..') )

describe('auth', function() {
  it('responds', function() {
    var rand = Math.random()
    var start = new Date().getTime()
    si.act({role:'auth',cmd:'ping',rand:rand},function(err,res){
      assert.ok(null==err)
      assert.equal(res.rand,rand)
      assert.ok(start<=res.when)
    })
  })
})
