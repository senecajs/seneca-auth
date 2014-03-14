
var gex           = require('gex')
var buffer        = require('buffer')
var connect       = require('connect')
var dispatch      = require('dispatch')

var HttpCode      = require('./HttpCode.js')
var Middlewares   = require('./Middlewares.js')
var RequestFilter = require('./RequestFilter.js')

function ServiceRouter(options, seneca, plugin, passport) {
  this._plugin = plugin
  this._seneca = seneca
  this._options = options
  this._passport = passport
  this._excludeFilter = new RequestFilter(options.exclude)
  this._includeFilter = new RequestFilter(options.include)
  this._contentFilter = new RequestFilter(options.content)
  this._services = {}

  this._passportInitialize = options.passport.initialize()
}

ServiceRouter.prototype.register = function(service, conf) {
  this._services[service] = new Service(service, conf, this._plugin, this._seneca, passport)
}

ServiceRouter.prototype._getServiceName = function(req) {
  return req.param('service') || 'local'
}

ServiceRouter.prototype._getService = function(req) {
  return this._services[this._getServiceName(req)]
}

function route() {
  var self = this
  function auth(req, res, next) {
    var prefix = req.query && req.query.prefix
    var context = req.query && req.query.context

    if( prefix ) {
      res.seneca.cookies.set(self._options.transientprefix + 'url-prefix', prefix)
    }

    if( context ) {
      res.seneca.cookies.set(self._options.transientprefix + 'context', context)
    }

    if (!self._options.action || self._options.action == 'login') {
      func = function (err, user, info) {
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
        self._seneca.act({role: 'auth', trigger: 'service-' + self._options.action, service: self._getServiceName(req),
            context: req.seneca.cookies.get(self._options.transientprefix + 'context'),
            data: data
          },

          // FIX: should call afterLogin and use options for redirect

          function (err, redirect) {
            if (err) return next(err)
            //res.redirect(redirect)
            sendredirect(HttpCode.FOUND, res, redirect)
          }
        )
      }
    }

    self._passport.authenticate(self._getServiceName(req), self._getService().conf(), func)(req, res, next)
  }

  var route_login = {
    GET: function(req, res, next) {
      pp_auth.local(req, res, function(err) {
        self._afterLogin(err, next, req, res)
      })
    },
    POST: function(req, res, next) {
      req.query = _.extend({}, req.query||{}, req.body||{})

      // TODO: make general
      if( !req.query.username ) {
        req.query.username = null != req.query.nick ? req.query.nick : req.query.email
      }

      pp_auth.local(req, res, function(err) {
        self._afterLogin(err, next, req, res)
      })
    },
  }


  function route_logout(req, res, next) {
    var clientToken = req.seneca.cookies.get(options.tokenkey)
    var serverToken
    res.seneca.cookies.set(options.tokenkey)

    if( req.seneca ) {
      serverToken = req.seneca.login && req.seneca.login.token
      delete req.seneca.user
      delete req.seneca.login
    }

    if( clientToken ) {
      seneca.act({role: 'user', cmd: 'logout', token: clientToken}, self._logerr)
    }

    if( serverToken && serverToken != clientToken ) {
      seneca.log('auth', 'token-mismatch', clientToken, serverToken)
      seneca.act({role: 'user', cmd: 'logout', token: serverToken}, self._logerr)
    }

    try { req.logout() } catch(err) { self._logerr(err) }

    var redirect = redirection(req, res, 'logout')

    self._respond(null, res, redirect.win, {ok: true})
  }


  var routes = {}
  routes[options.urlpath.login]    = route_login
  routes[options.urlpath.logout]   = route_logout


  routes['/auth/' + service] = function (req, res, next) {
    pp_auth[service](req, res, function (err) {
      if (err) return next(err)
    })
  }

  routes['/auth/' + service + '/callback'] = function (req, res, next) {
    pp_auth[service](req, res, function (err) {
      if (err) {
        next(err)
      } else {
        self._afterLogin(undefined, next, req, res)
      }
    })
  }


  this._dispatcher = dispatch(routes)
}

ServiceRouter.prototype._requestHandler = function(req, res, next) {

  var httpMiddlewares = new Middlewares()

  httpMiddlewares.use(this._passportInitialize, this)
  httpMiddlewares.use(this._init_session, this)
  httpMiddlewares.use(this._restriction, this)
  httpMiddlewares.use(this._dispatcher, this)

  return function(req, res, next) {

    var self = this
    if( this._contentFilter.match(req) ) {
      req.url = req.url.substring(this._options.prefix.length)
      return app( req, res )
    }

    if( this._options.defaultpages ) {
      var loginpage = _.reduce(this._options.loginpages, function(found, loginpage) {
        if( found ) return found
        if( req.url == loginpage.path ) return loginpage
      }, null)

      if( loginpage ) {
        req.url = '/login.html'
        return app( req, res )
      }
    }

    if( this._excludeFilter.match(req) && !this._includeFilter.match(req) ) {
      return next()
    }

    // TODO: assumes req.seneca exists, so has dependency on seneca-web
    req.seneca.cookies = new Cookies(req, res)


    httpMiddlewares.execute(req, res, next)
  }
}

ServiceRouter.prototype.forwardRequestToService = function ( req, res, args, act, respond ) {
  var redirect = this._redirection(req, res, args.cmd)

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

    out.httpstatus$ = out.ok ? HttpCode.OK : HttpCode.BAD_REQUEST
    out.httpredirect$ = redirect && redirect.win
    respond(null, out)
  })
}

ServiceRouter.prototype.redirection = function(req, res, kind) {
  var transientprefix = req.seneca.cookies.get(this._options.transientprefix + 'url-prefix')
  req.seneca.cookies.set(this._options.transientprefix + 'url-prefix')

  transientprefix = req.query && void 0 != req.query.prefix ? req.query.prefix : transientprefix

  transientprefix = void 0 == transientprefix ? '' : '' + transientprefix


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
      win:  _.isString(req.query.win) ? req.query.win : transientprefix + ( (rk && rk.win)  || options.redirect.win ),
      fail: _.isString(req.query.fail) ? req.query.fail : transientprefix + ( (rk && rk.fail) || options.redirect.fail ),
    }
  }

  return redirect
}
