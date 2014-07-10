
var buffer            = require('buffer')
var connect           = require('connect')
var Cookies           = require('cookies')
var dispatch          = require('dispatch')
var _                 = require('underscore')
var Middlewares       = require('middlewares')

var Service           = require('./Service.js')
var Http              = require('./HttpCode.js')
var RequestArgParser  = require('request-arguments-parser')

function ServiceRouter(options, seneca, plugin, passport) {

  this._plugin = plugin
  this._seneca = seneca
  this._options = options
  this._passport = passport
  this._services = {}

  this._buildDispatcher()

  var contentFolder = require('path').normalize(__dirname + '/../web')
  this._staticRequestHandler = connect.static(contentFolder)

  var self = this;

  seneca.add({ role: plugin, cmd: 'register_service' },   cmd_register_service)

  function cmd_register_service(args, callback) {
    seneca.log.info('registering auth service ['+args.service+']')
    passport.use(args.service, args.plugin)
    self.registerService(args.service, args.conf)
    callback()
  }

}

ServiceRouter.prototype.registerService = function(service, conf) {
  this._services[service] = new Service(service, conf)
}

ServiceRouter.prototype._getServiceName = function(req) {
  if(req.param && req.param('service')) {
    return req.param('service')
  } else {
    return 'local'
  }
}

ServiceRouter.prototype._getService = function(req) {
  var serviceName = this._getServiceName(req)
  var service = this._services[serviceName]
  if(!service) {
    this._seneca.log.error('no service with name ['+serviceName+']')
  }
  return this._services[this._getServiceName(req)]
}

ServiceRouter.prototype._authRequest = function(req, res, next) {

  var prefix = req.query && req.query.prefix
  var context = req.query && req.query.context

  var self = this

  var serviceName = self._getServiceName(req)

  if( prefix ) {
    res.seneca.cookies.set(self._options.transientPrefix + 'url-prefix', prefix)
  }

  if( context ) {
    res.seneca.cookies.set(self._options.transientPrefix + 'context', context)
  }
  // TODO: The local auth plugin should not be treated differently than other plugins

  if(serviceName !== 'local') {
    var func
    if (!self._getService(req).conf().action || self._getService(req).conf().action == 'login') {
      func = function (err, user, info) {

        if(err) {
          return next(err)
        }

        self._seneca.act(_.extend({}, user, {role: 'auth', trigger: 'service-login', service: self._getServiceName(req)}),
          function (err, user) {
            if (err) return self._afterLogin(err, next, req, res)

            self._seneca.act({role: 'user', cmd: 'login', nick: user.nick, auto: true}, function (err, out) {
              req.user = out
              self._afterLogin(err, next, req, res)
            })
          }
        )
      }
    } else {
      func = function (err, data, info) {

        if(err) {
          return next(err)
        }
        self._seneca.act({role: 'auth', trigger: 'service-' + self._getService(req).conf().action, service: self._getServiceName(req),
            context: req.seneca.cookies.get(self._options.transientPrefix + 'context'),
            data: data
          },

          // FIX: should call afterLogin and use options for redirect

          function (err, redirect) {
            if (err) return next(err)
            //res.redirect(redirect)
            sendredirect(Http.FOUND, res, redirect)
          }
        )
      }
    }
  }

  if(!func) {
    func = function(err, user, info) {
      req.user = user
      return next(err);
    }

  }

  self._passport.authenticate(serviceName, self._getService(req).conf().authconf, func)(req, res, function(err) {
    next(err)

  })
}

ServiceRouter.prototype._templatize = function(val) {
  return ':'+val
}

ServiceRouter.prototype._buildDispatcher = function() {

  var self = this

  var routes = {}
  routes[this._options.urlpath.login] = function(req, res, next) {

    req.query = _.extend({}, req.query||{}, req.body||{})

    // TODO: make general
    if( !req.query.username ) {
      req.query.username = null != req.query.nick ? req.query.nick : req.query.email
    }
    self._authRequest(req, res, function(err) {
      self._afterLogin(err, next, req, res)
    })
  }

  routes[this._options.urlpath.logout] = function (req, res, next) {

    var clientToken = req.seneca.cookies.get(self._options.tokenkey)
    var serverToken
    res.seneca.cookies.set(self._options.tokenkey)

    if( req.seneca ) {
      serverToken = req.seneca.login && req.seneca.login.id
      delete req.seneca.user
      delete req.seneca.login
    }

    if( clientToken ) {
      self._seneca.act({role: 'user', cmd: 'logout', token: clientToken}, self._logerr)
    }

    if( serverToken && serverToken != clientToken ) {
      self._seneca.log('auth', 'token-mismatch', clientToken, serverToken)
      self._seneca.act({role: 'user', cmd: 'logout', token: serverToken}, self._logerr)
    }

    try { req.logout() } catch(err) { self._logerr(err) }

    var redirect = self._redirection(req, res, 'logout')

    self._respond(null, res, redirect.win, {ok: true})
  }


  routes[self._options.prefix + '/' + self._templatize('service')] = function (req, res, next, service) {
    if(!req.params) {
      req.params = {}
    }
    req.params.service = service

    if(req.path !== self._options.urlpath.instance &&
      req.path !== self._options.urlpath.register &&
      req.path !== self._options.urlpath.reset_create &&
      req.path !== self._options.urlpath.reset_load &&
      req.path !== self._options.urlpath.reset_execute) {

      self._authRequest(req, res, function (err) {
        next(err)
      })

    } else {
      next()
    }
  }

  routes[self._options.prefix + '/' + self._templatize('service') + '/callback'] = function (req, res, next, service) {

    if(!req.params) {
      req.params = {}
    }
    req.params.service = service

    self._authRequest(req, res, function (err) {
      if (err) {
        next(err)
      } else {
        self._afterLogin(undefined, next, req, res)
      }
    })
  }
  this._dispatcher = dispatch(routes)
}

ServiceRouter.prototype.middleware = function() {

  var authMiddlewares = new Middlewares()
  authMiddlewares.use(this._passport.initialize())
  authMiddlewares.use(require('./middleware/senecaSession.js')(this._seneca, this._options))
  authMiddlewares.use(require('./middleware/restrictAuthOnly.js')(this._options))
  authMiddlewares.use(this._dispatcher, this)

  var preparationMiddlewares = new Middlewares()
  preparationMiddlewares.use(require('./middleware/static.js')(this._options))
  preparationMiddlewares.use(require('./middleware/cookies.js')())
  preparationMiddlewares.use(require('./middleware/filter.js')(this._options, authMiddlewares))
  return preparationMiddlewares.export()
}

ServiceRouter.prototype.forwardRequestToService = function () {
  var self = this
  return function ( req, res, args, act, respond ) {


    var redirect = self._redirection(req, res, args.cmd)


    var user = req.seneca && req.seneca.user
    if( user ) {
      args.user = user
    }

    var login = req.seneca && req.seneca.login
    if( login ) {
      args.login = login
    }
    act(args, function( err, out ) {

      if( err ) {
        err.seneca = err.seneca || {}
        err.seneca.httpredirect = redirect && redirect.fail
        return respond(err)
      }

      out.httpstatus$ = out.ok ? Http.OK : Http.BAD_REQUEST
      out.httpredirect$ = redirect && redirect.win
      respond(null, out)
    })
  }
}

ServiceRouter.prototype._redirection = function(req, res, kind) {
  var transientPrefix = req.seneca.cookies.get(this._options.transientPrefix + 'url-prefix')
  req.seneca.cookies.set(this._options.transientPrefix + 'url-prefix')

  transientPrefix = (req.query && req.query.prefix) ? req.query.prefix : transientPrefix || ''

  var redirect = false
  var ct = (req.headers['content-type']||'').split(';')[0]

  if( this._options.redirect.always ) {
    redirect = true
  } else if( !_.isUndefined(req.query.redirect) ) {
    redirect = S(req.query.redirect).toBoolean()
  } else if( 'application/x-www-form-urlencoded' == ct || 'multipart/form-data' == ct ) {
    redirect = true
  } else if( 'application/json' == ct ) {
    redirect = false
  } else {
    redirect = true
  }

  if( redirect ) {
    var rk = this._options.redirect[kind]

    redirect = {
      win:  _.isString(req.query.win) ? req.query.win : transientPrefix + ( (rk && rk.win)  || this._options.redirect.win ),
      fail: _.isString(req.query.fail) ? req.query.fail : transientPrefix + ( (rk && rk.fail) || this._options.redirect.fail ),
    }
  }

  return redirect
}




ServiceRouter.prototype._logerr = function(err) {
  if( err ) {
    return this._seneca.log('error', err)
  }
}

ServiceRouter.prototype._afterLogin = function(err, next, req, res) {
  if( err && !err.why ) return next(err)
  var self = this

  var context = req.seneca.cookies.get(this._options.transientprefix + 'context')
  res.seneca.cookies.set(this._options.transientprefix + 'context')

  var redirect = this._redirection(req, res, 'login')

  // req.user actually == {ok: , user: , login: }
  if( req.user && req.user.ok ) {
    // rename passport req.user prop
    req.seneca.user = req.user.user
    req.seneca.login = req.user.login

//    this._adminLocal(req, req.seneca.user)

    res.seneca.cookies.set(this._options.tokenkey, req.seneca.login.id)

    if( '' != context ) {
      req.seneca.login.context = context
      req.seneca.login.save$(function(err) {
        self._do_respond(req, res, redirect, err)
      })
    } else {
      self._do_respond(req, res, redirect, undefined)
    }
  } else {
    //var out = {ok: false, why: (req.user&&req.user.why)||'no-user'}
    //delete req.user
    var out = {ok: false, why: err ? err.why : null}
    if( redirect ) {
      req.seneca.log.debug('redirect', 'login', 'fail', redirect.fail)

      sendredirect( Http.FOUND, res, redirect.fail )
    } else {
      sendjson(Http.BAD_REQUEST, res, out)
    }
  }

}

ServiceRouter.prototype._do_respond = function(req, res, redirect, err) {
  if( err) return next(err)

  if( redirect ) {
    req.seneca.log.debug('redirect', 'login', 'win', redirect.win)
    sendredirect( Http.FOUND, res, redirect.win )
  } else {
    // FIX: this should call instance
    // FIX: how to handle errors here?
    this._seneca.act({role: this._plugin, cmd: 'clean', user: req.seneca.user, login: req.seneca.login}, function(err, out) {

      out.ok = true


      // FIX: should be provided by seneca-web
      sendjson( Http.OK, res, out )
    })
  }
}



ServiceRouter.prototype._respond = function(err, res, redirect, data) {

  if( redirect ) {
    //res.redirect( redirect )
    sendredirect(Http.FOUND, res, redirect)
  } else {
    var httpCode = Http.OK
    if(_.isNumber(err)) {
      httpCode = err
    } else if(_.isObject(err)) {
      httpCode = Http.INTERNAL_SERVER_ERROR
    } else if(!data.ok) {
      httpCode = Http.BAD_REQUEST
    }
    sendjson(httpCode, res, data)
  }
}

// TODO: move to seneca-web
function sendredirect(code, res, url) {
  res.writeHead(Http.MOVED_PERMANENTLY, {Location: url})
  res.end()
}

// TODO: move to seneca-web
function sendjson( code, res, out ) {
  // TODO: need killcircles
  var outjson = JSON.stringify(out)
  res.writeHead( code, {
    'Content-Type':   'application/json',
    'Cache-Control':  'private, max-age=0, no-cache, no-store',
    'Content-Length': buffer.Buffer.byteLength(outjson)
  })
  res.end( outjson )
}

module.exports = ServiceRouter
