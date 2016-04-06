// External modules.
var _ = require('lodash')
var Restrict = require('./hapi-restrict')

var internals = {}

module.exports = function (options) {
  var seneca = this
  var restrict = new Restrict(options, this)

  internals.seneca = this
  internals.options = options

  // seneca web endpoints map
  internals.map = {
    logout: {GET: true, POST: true, data: true, auth: 'session', alias: options.urlpath.logout},
    register: {POST: true, data: true, alias: options.urlpath.register},
    user: {GET: true, POST: true, auth: 'session', alias: options.urlpath.user},
    create_reset: {POST: true, data: true, alias: options.urlpath.create_reset},
    load_reset: {POST: true, data: true, alias: options.urlpath.load_reset},
    execute_reset: {POST: true, data: true, alias: options.urlpath.execute_reset},
    confirm: {POST: true, data: true, alias: options.urlpath.confirm},
    update_user: {POST: true, data: true, auth: 'session', alias: options.urlpath.update_user},
    change_password: {POST: true, data: true, auth: 'session', alias: options.urlpath.change_password}
  }

  function get_restriction (msg, done) {
    var path = msg.path

    var restrict_mode = restrict.restriction()(path)
    if (restrict_mode) {
      done(null, {auth: 'session'})
    }
    else {
      done()
    }
  }

  function validateToken (msg, done) {
    var req = msg.req$

    var clienttoken = msg.token

    if (!clienttoken) {
      return done('User not authorized')
    }

    req.seneca.act('role: user,cmd: auth', {token: clienttoken}, function (err, out) {
      if (err) {
        return done(err)
      }
      if (out && !out.ok) {
        return done(out.why)
      }
      if (out && out.user) {
        req.seneca.user = out.user
        req.seneca.login = out.login
        return done(null, {user: out.user, login: out.login})
      }
      done()
    })
  }

  // LOGIN START
  function afterlogin (err, next, req, res) {
    if (err) {
      return req.seneca.act('role: auth, do: respond', {err: err, action: 'login', req: req, res: res}, next)
    }

    if (req.seneca.user) {
      req.seneca.act('role: auth, set: token', {
        token: req.seneca.login.id
      }, function (err) {
        return req.seneca.act('role: auth, do: respond', {err: err, action: 'login', req: req, res: res}, next)
      })
    }
    else {
      req.seneca.act('role: auth, do: respond', {
        err: (err ? err.why : 'Unknown error'),
        action: 'login',
        req: req,
        res: res
      }, next)
    }
  }

  function cmd_login (msg, respond) {
    var req = msg.req$
    var res = msg.res$

    req.query = _.extend({}, req.query || {}, req.body || {})

    req.seneca.act("role: 'auth', hook: 'map_fields'", {action: 'login', data: msg.data}, function (err, userData) {
      if (err) {
        req.seneca.log.error('error ', err)
        // handle error
      }

      var username =
        req.payload.username
          ? req.payload.username
          : (
          req.payload.nick
            ? req.payload.nick
            : (
            userData.username
              ? userData.username
              : userData.email
          )
        )
      var password = userData.password

      req.seneca.act(
        'role: user, cmd: login',
        {nick: username, email: username, password: password},
        function (err, out) {
          if (err || !(out && out.ok)) {
            req.seneca.act('role: auth, do: respond', {
              err: (err || (out && out.why)),
              action: 'login',
              req: req
            }, respond)
          }
          else {
            req.seneca.user = out.user
            req.seneca.login = out.login

            req.seneca.act('role: auth, restrict: login', out, function (err, out) {
              if (err || !(out && out.ok)) {
                return req.seneca.act('role: auth, do: respond', {
                  err: (err || (out && out.why)),
                  action: 'login',
                  req: req
                }, respond)
              }
              afterlogin(err, respond, req, res)
            })
          }
        })
    })
  }

  // LOGIN END

  // LOGOUT START
  function cmd_logout (msg, respond) {
    var req = msg.req$

    // get token from request
    req.seneca.act("role: 'auth', get: 'token'", {tokenkey: options.tokenkey}, function (err, clienttoken) {
      if (err) {
        return req.seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
      }

      if (!clienttoken) {
        return req.seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
      }

      clienttoken = clienttoken.token
      // delete token
      req.seneca.act("role: 'auth', set: 'token'", {tokenkey: options.tokenkey}, function (err) {
        if (err) {
          return req.seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
        }

        req.seneca.act("role:'user',cmd:'logout'", {token: clienttoken}, function (err) {
          if (err) {
            req.seneca.log('error ', err)
          }
          req.cookieAuth.clear()
          delete req.seneca.user
          delete req.seneca.login
          return req.seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
        })
      })
    })
  }

  // LOGOUT END

  function registerAuthService (args, done) {
    var service = args.service
    seneca.add({role: 'auth', trigger: 'service-register-' + service}, trigger_service_register)
    seneca.add({role: 'auth', trigger: 'service-login-' + service}, trigger_service_login)
    done()
  }

  function trigger_service_login (args, respond) {
    var credentials = args.req$.auth.credentials
    var req = args.req$
    var res = args.res$
    var service = args.service

    req.seneca.act('role: auth, prepare: ' + service + '_login_data', {
      accessToken: credentials.token,
      refreshToken: credentials.refreshToken,
      profile: credentials.profile,
      params: credentials
    }, function (err, data) {
      if (err) {
        return afterlogin(err, respond, req, res)
      }

      delete data.id
      req.seneca.act('role: auth, trigger: service-register-' + service, {user: data, service: service}, function (err, data) {
        if (err) {
          return afterlogin(err, respond, req, res)
        }

        req.seneca.act(
          'role: user, cmd: login',
          {nick: data.nick, auto: true},
          function (err, out) {
            if (err || !(out && out.ok)) {
              req.seneca.act('role: auth, do: respond', {
                err: (err || (out && out.why)),
                action: 'login',
                req: req
              }, respond)
            }
            else {
              req.seneca.user = out.user
              req.seneca.login = out.login

              req.seneca.act('role: auth, restrict: login', out, function (err, out) {
                if (err || !(out && out.ok)) {
                  return req.seneca.act('role: auth, do: respond', {
                    err: (err || (out && out.why)),
                    action: 'login',
                    req: req
                  }, respond)
                }

                afterlogin(err, respond, req, res)
              })
            }
          })
      })
    })
  }

  function identify_service_user (msg, respond) {
    if (!msg.user) {
      return respond(null, {ok: false, why: 'no-user'})
    }

    var user_data = msg.user

    var q = {}

    if (user_data.identifier) {
      q[msg.service + '_id'] = user_data.identifier
      user_data[msg.service + '_id'] = user_data.identifier
    }
    else {
      return respond(null, {ok: false, why: 'no-identifier'})
    }

    seneca.act("role: 'user', get: 'user'", q, respond)
  }

  function trigger_service_register (msg, respond) {
    var seneca = this

    if (!msg.user) {
      return respond(null, {ok: false, why: 'no-user'})
    }

    var user_data = msg.user
    var service = msg.service

    seneca.act("role: 'auth', identify: 'user'", {user: user_data, service: service}, function (err, data) {
      if (err) return respond(null, {ok: false, why: 'no-identifier'})

      if (!data.ok) return respond(null, {ok: false, why: data.why})

      var user = data.user
      if (!user) {
        seneca.act("role:'user',cmd:'register'", user_data, function (err, out) {
          if (err) {
            return respond(null, {ok: false, why: err})
          }

          respond(null, out.user)
        })
      }
      else {
        seneca.act("role:'user',cmd:'update'", user_data, function (err, out) {
          if (err) {
            return respond(null, {ok: false, why: err})
          }

          respond(null, out.user)
        })
      }
    })
  }

  internals.seneca
    .add('role: auth, cmd: login', cmd_login)
    .add('role: auth, cmd: logout', cmd_logout)
    .add('role: auth, do: validateToken', validateToken)
    .add('role: web, get: restriction', get_restriction)

  var config = {prefix: options.prefix, redirects: {}}

  function init (args, done) {
    internals.seneca.act(
      'role: web',
      {
        plugin: 'auth',
        config: config,
        use: {
          prefix: options.prefix,
          pin: {role: 'auth', cmd: '*'},
          map: internals.map
        }
      }, done)
  }

  seneca
    .add('role: auth, cmd: register_service', registerAuthService)
    .add('role: auth, identify: user', identify_service_user)
    .add('init: hapi-auth-plugin', init)

  seneca.add('role: auth, restrict: login', function (args, done) {
    done(null, {ok: true, why: 'no-restrict'})
  })

  return {
    name: 'hapi-auth-plugin'
  }
}
