'use strict'

var Assert = require('assert')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var suite = lab.suite
var test = lab.test
var before = lab.before
var after = lab.after

var Util = require('./hapi-util.js')


suite('Hapi restrict suite tests ', function () {
  var server
  var user = {nick: 'u1', name: 'nu1', email: 'u1@example.com', password: 'u1', active: true}
  var cookie

  before({}, function (done) {
    Util.init({}, function (err, srv) {
      Assert.ok(!err)

      server = srv
      done()
    })
  })

  after({}, function (done) {
    server.seneca.close()
    done()
  })

  test('failed api/service restrict test', function (done) {
    var url = '/api/service'

    server.inject({
      url: url,
      method: 'GET'
    }, function (res) {
      Assert.equal(401, res.statusCode)

      done()
    })
  })

  test('auth/register test', function (done) {
    var url = '/auth/register'

    server.inject({
      url: url,
      method: 'POST',
      payload: user
    }, function (res) {
      Assert.equal(200, res.statusCode)
      Assert(JSON.parse(res.payload).ok)
      Assert(JSON.parse(res.payload).user)
      Assert(JSON.parse(res.payload).login)

      cookie = Util.checkCookie(res)

      done()
    })
  })

  test('failed api/service restrict test', function (done) {
    var url = '/api/service'

    server.inject({
      url: url,
      method: 'GET',
      headers: {cookie: 'seneca-login=' + cookie}
    }, function (res) {
      Assert.equal(200, res.statusCode)

      done()
    })
  })
})
