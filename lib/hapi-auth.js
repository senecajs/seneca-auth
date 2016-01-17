// External modules.
var _ = require('lodash')
var Restrict = require('./hapi-restrict')
var error = require('eraro')({
  package: 'auth'
})

var internals = {}

module.exports = function (options) {
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

  internals.set_local_auth = function (strategy) {
    internals.seneca.act(
      'role: web',
      {
        plugin: 'auth',
        config: config,
        use: {
          prefix: options.prefix,
          pin: {role: 'auth', cmd: '*'},
          map: {
            login: {GET: true, POST: true, data: true, alias: options.urlpath.login}
          }
        }
      })
  }

  internals.init_strategies = function () {
    internals.set_local_auth()
  }

  internals.init_strategies()

  function set_auth_provider(msg, done) {
    var strategy = msg.strategy

    internals.seneca.act('role: web, get: server', function (err, data) {
      if (err) {
        throw new error('Cannot retrieve server: ' + err)
      }

      if (!data) {
        throw new error('Cannot retrieve server')
      }

      server = data.server
      server.auth.strategy(strategy.provider, 'bell', strategy)

      internals.seneca.act(
        'role: web',
        {
          plugin: 'auth',
          config: config,
          use: {
            prefix: options.prefix,
            pin: {role: 'auth', cmd: '*'},
            auth: strategy.provider,
            map: {
              login: {GET: true, POST: true, data: true, alias: 'login_' + strategy.provider}
            }
          }
        })
    })
  }

  function get_restriction(msg, done){
    var path = msg.path

    var restrict_mode = restrict.restriction()(path)
    if (restrict_mode){
      done(null, {auth:  'session'})
    }
    else{
      done()
    }
  }

  function auth_startware (msg, done) {
    var req = msg.req$

    var clienttoken = msg.token

    if (!clienttoken) {
      return done()
    }

    req.seneca.act('role: user,cmd: auth', {token: clienttoken}, function(err, out){
      if (out && out.user){
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
      return seneca.act('role: auth, do: respond', {err: err, action: 'login', req: req}, next)
    }

    if (req.seneca.user) {
      req.seneca.act('role: auth, set: token', {
        token: req.seneca.login.id
      }, function (err) {
        return req.seneca.act('role: auth, do: respond', {err: err, action: 'login', req: req}, next)
      })
    }
    else {
      req.seneca.act('role: auth, do: respond', {err: (err ? err.why : 'Unknown error'), action: 'login', req: req}, next)
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
            req.seneca.act('role: auth, do: respond', {err: (err || (out && out.why)), action: 'login', req: req}, respond)
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
        return req.seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
      }

      if (!clienttoken){
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

          delete req.seneca.user
          delete req.seneca.login
          return req.seneca.act('role: auth, do: respond', {err: err, action: 'logout', req: req}, respond)
        })
      })
    })
  }
  // LOGOUT END

  internals.seneca
    .add('role: auth, cmd: login', cmd_login)
    .add('role: auth, cmd: logout', cmd_logout)
    .add('role: web, do: startware', auth_startware)
    .add('role: web, get: restriction', get_restriction)

  var config = {prefix: options.prefix, redirects: {}}

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
    })
}
