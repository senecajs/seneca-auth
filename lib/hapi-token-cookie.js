'use strict'

// external modules
var _ = require('lodash')
var Cookies = require('cookies')

module.exports = function (options) {
  var seneca = this

  function set_token (msg, done) {
    var tokenkey = msg.tokenkey || options.tokenkey || 'seneca-login'
    var token = msg.token
    var res = this.fixedargs.req$.raw.res

    res.cookies = res.cookies || {}
    res.cookies[tokenkey] = token

    done(null, {token: token})
  }


  function get_token (msg, done) {
    var tokenkey = msg.tokenkey || options.tokenkey || 'seneca-login'
    var req = this.fixedargs.req$

    if (!req.headers.cookie) {
      return done(null, {})
    }

    var cookie = req.headers.cookie
    if (cookie.indexOf(tokenkey + '=') === -1){
      return done(null, {})
    }

    cookie = cookie.substr( cookie.indexOf('=') + 1 )

    done(null, {token: cookie})
  }


  seneca.add({role: 'auth', set: 'token'}, set_token)
  seneca.add({role: 'auth', get: 'token'}, get_token)
}
