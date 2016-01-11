// External modules.
var _ = require('lodash')

module.exports = function (options) {
  var seneca = this

  // LOGIN START
  function afterlogin (err, next, req, res) {
    if (err) {
      return seneca.act('role: auth, do: respond', {err: err, action: 'login', req: req}, next)
    }

    if (req.seneca.user) {
      req.seneca.act('role: auth, set: token', {
        token: req.seneca.login.id
      }, function (err) {
        return seneca.act('role: auth, do: respond', {err: err, action: 'login', req: req}, next)
      })
    }
    else {
      seneca.act('role: auth, do: respond', {err: (err ? err.why : 'Unknown error'), action: 'login', req: req}, next)
    }
  }

  function cmd_login (msg, respond) {
    var req = msg.req$
    var res = msg.res$

    req.query = _.extend({}, req.query || {}, req.body || {})

    seneca.act("role: 'auth', hook: 'map_fields'", {action: 'login', data: msg.data}, function (err, userData) {
      if (err) {
        seneca.log.error('error ', err)
        // handle error
      }

      var username =
        req.query.username
          ? req.query.username
          : (
          req.query.nick
            ? req.query.nick
            : (
            userData.username
              ? userData.username
              : userData.email
          )
        )
      var password = userData.password

      seneca.act(
        'role: user, cmd: login',
        {nick: username, email: username, password: password},
        function (err, out) {
          if (err || !(out && out.ok)) {
            seneca.act('role: auth, do: respond', {err: (err || (out && out.why)), action: 'login', req: req}, respond)
          }
          else {
            req.seneca.user = out.user
            req.seneca.login = out.login

            afterlogin(err, respond, req, res)
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
        return seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
      }

      clienttoken = clienttoken.token
      // delete token
      req.seneca.act("role: 'auth', set: 'token'", {tokenkey: options.tokenkey}, function (err) {
        if (err) {
          return seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
        }

        req.seneca.act("role:'user',cmd:'logout'", {token: clienttoken}, function (err) {
          if (err) {
            seneca.log('error ', err)
          }

          return seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
        })
      })
    })
  }
  // LOGOUT END

  seneca.add({role: 'auth', cmd: 'login'}, cmd_login)
  seneca.add({role: 'auth', cmd: 'logout'}, cmd_logout)

  var config = {prefix: options.prefix, redirects: {}}

  // seneca web endpoints map
  var map = {
    login: {POST: true, data: true, alias: options.urlpath.login},
    logout: {POST: true, data: true, alias: options.urlpath.logout},
    register: {POST: true, data: true, alias: options.urlpath.register},
    user: {GET: true, alias: options.urlpath.user},
    create_reset: {POST: true, data: true, alias: options.urlpath.create_reset},
    load_reset: {POST: true, data: true, alias: options.urlpath.load_reset},
    execute_reset: {POST: true, data: true, alias: options.urlpath.execute_reset},
    confirm: {POST: true, data: true, alias: options.urlpath.confirm},
    update_user: {POST: true, data: true, alias: options.urlpath.update_user},
    change_password: {POST: true, data: true, alias: options.urlpath.change_password}
  }

  function authcontext (req, res, msg, act, respond) {
    var user = req.seneca && req.seneca.user
    if (user) {
      msg.user = user
    }

    var login = req.seneca && req.seneca.login
    if (login) {
      msg.login = login
    }

    act(msg, function (err, out) {
      if (err) {
        seneca.log.debug(err)
        out = out || {}

        return respond(null, out)
      }

      return respond(null, out)
    })
  }

  function checkurl (match, done) {
    seneca.act("role:'auth',cmd: 'urlmatcher'", {spec: match}, function (err, checks) {
      if (err) return done(err)

      return done(null, function (req) {
        for (var i = 0; i < checks.length; i++) {
          if (checks[i](req)) {
            return true
          }
        }
        return false
      })
    })
  }

  var exclude_url
  checkurl(options.exclude, function (err, response) {
    if (err) return

    exclude_url = response
  })

  var include_url
  checkurl(options.include, function (err, response) {
    if (err) return

    include_url = response
  })

  var checks
  if (!_.isFunction(options.restrict)) {
    seneca.act("role:'auth', cmd: 'urlmatcher'", {spec: options.restrict}, function (err, result) {
      if (!err) {
        checks = result
      }
    })
  }

  function buildservice () {
  }

  seneca.act(
    'role: web',
    {
      plugin: 'auth',
      config: config,
      use: {
        prefix: options.prefix,
        pin: {role: 'auth', cmd: '*'},
        startware: buildservice(),
        map: map
      }
    })
}
