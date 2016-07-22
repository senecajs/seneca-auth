// DO NOT RUN HAPI TESTS FOR NODE LESS THAN 4.0.0
if (process.version < 'v4.0.0') {
  return
}

var _ = require('lodash')

var Chairo = require('chairo')
var Hapi = require('hapi')
var Bell = require('bell')
var Hapi_Cookie = require('hapi-auth-cookie')

exports.init = function (options, done) {
  var server = new Hapi.Server()
  server.connection()

  server.register([
    Hapi_Cookie,
    Bell,
    {
      register: Chairo,
      options: {
        log: 'silent',
        web: true
      }
    }], function (err) {
      if (err) {
        return done(err)
      }
      var si = server.seneca

      si.use('user')
      si.use(
        require('..'),
        _.extend(
          {
            secure: false,
            restrict: '/api'
          }, options || {}))
      si.add({role: 'test', cmd: 'service'}, function (args, cb) {
        return cb(null, {ok: true, test: true})
      })
      si.add({role: 'test', cmd: 'service2'}, function (args, cb) {
        return cb(null, {ok: true, test: true})
      })
      si.act({
        role: 'web',
        plugin: 'test',
        use: {
          prefix: '/api',
          pin: {role: 'test', cmd: '*'},
          map: {
            service: {GET: true},
            service2: {GET: true}
          }
        }
      }, function () {
        done(null, server)
      })
    }
  )
}

exports.checkCookie = function (res) {
  var cookie = res.headers['set-cookie'][0]
  cookie = cookie.match(/(?:[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)\s*=\s*(?:([^\x00-\x20\"\,\;\\\x7F]*))/)[1]
  return cookie
}
