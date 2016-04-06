'use strict'

var Assert = require('assert')

var lab = exports.lab = require('lab').script()
var suite = lab.suite
var test = lab.test

process.setMaxListeners(0)

suite('config suite tests ', function () {
  var cfgs = ['service', 'sendemail', 'email']
  for (var i in cfgs) {
    var cfg = cfgs[i]
    test('with ' + cfg + ' options test', function (done) {
      var si = require('seneca')({errhandler: errhandler, debug: {undead: true}})

      si.use(require('seneca-entity'))
      si.use('user')
      var config = {}
      config[cfg] = {}
      si.use(require('..'), config)

      function errhandler (err) {
        Assert(err.msg.indexOf('auth: <' + cfg + '> option is no longer supported'))
        done()
      }
    })
  }

  test('known server type', function (done) {
    var si = require('seneca')({errhandler: errhandler, debug: {undead: true}})
    si.use(require('seneca-entity'))
    si.use('user')
    var config = {}
    config.server = 'hapi'
    si.use(require('..'), config)

    function errhandler (err) {
      done()// if this is called then test will fail.
    }
    done()
  })
})
