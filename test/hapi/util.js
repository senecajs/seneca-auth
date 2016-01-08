var Assert = require('assert')
var _ = require('lodash')

var Chairo = require ( 'chairo' )
var Hapi = require ( 'hapi' )

exports.init = function (options, done) {
  var server = new Hapi.Server ()
  server.connection()

  server.register(
    {
      register: Chairo,
      options: {
        webPlugin: require('seneca-web')
      }
    }, function ( err ) {
      var si = server.seneca

      si.use('user')
      si.use(require('../..'), _.extend({secure: true, restrict: '/api', server: 'hapi'}, options || {}))

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
      }, function (){
        done(null, server)
      })
    })
}

exports.checkCookie = function (res) {
  return res.headers['set-cookie'][0]
}
