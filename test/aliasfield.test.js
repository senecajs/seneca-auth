'use strict'

var Assert = require('assert')

var Lab = require('lab')
var lab = (exports.lab = Lab.script())
var suite = lab.suite
var test = lab.test
var before = lab.before

var Util = require('./util.js')
var seneca

suite('restricted suite tests ', function() {
  before({}, function(done) {
    Util.init({}, function(err, agentData, si) {
      Assert.ok(!err)
      // agent = agentData

      seneca = si
      done()
    })
  })

  test('map_fields nick', function(done) {
    var user = {
      nick: 'u1',
      name: 'nu1',
      email: 'u1@example.com',
      password: 'u1',
      active: true
    }
    seneca.act('role:"auth",hook:"map_fields"', { data: user }, function(
      err,
      data
    ) {
      Assert(!err, 'No error')
      Assert.equal(user.nick, data.nick)
      done()
    })
  })

  test('map_fields username', function(done) {
    var user = {
      username: 'nu1',
      email: 'u1@example.com',
      password: 'u1',
      active: true
    }
    seneca.act('role:"auth",hook:"map_fields"', { data: user }, function(
      err,
      data
    ) {
      Assert(!err, 'No error')
      Assert.equal(user.username, data.nick)
      done()
    })
  })

  test('map_fields email', function(done) {
    var user = { email: 'u1@example.com', password: 'u1', active: true }
    seneca.act('role:"auth",hook:"map_fields"', { data: user }, function(
      err,
      data
    ) {
      Assert(!err, 'No error')
      Assert.equal(user.email, data.nick)
      done()
    })
  })
})
