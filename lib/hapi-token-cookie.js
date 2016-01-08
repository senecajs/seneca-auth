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


  function get_token (args, cb) {
    var tokenkey = args.tokenkey || options.tokenkey
    var res = this.fixedargs.res$
    var req = this.fixedargs.req$

    if (!req.seneca.cookies) {
      req.seneca.cookies = new Cookies(req, res)
    }

    cb(null, {token: req.seneca.cookies.get(tokenkey)})
  }


  seneca.add({role: 'auth', set: 'token'}, set_token)
  seneca.add({role: 'auth', get: 'token'}, get_token)
}
