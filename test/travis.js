"use strict";


var assert = require('assert')
var _      = require('underscore')

var mock = {
  cmd: {},
  add: function(spec,func){ this.cmd[spec.cmd]=func },
  make: function() { return {} },
  util: {deepextend: function(first){return first}},
  pin: function(){return {entity:function(){}}},
  err: function(){}
}

var user_plugin = require('..')

user_plugin(mock,{},function(){
  var rand = Math.random()
  var start = new Date().getTime()
  mock.cmd.ping({rand:rand},function(err,res){
    assert.ok(null==err)
    assert.equal(res.rand,rand)
    assert.ok(start<=res.when)
  })
})
