
var gex           = require('gex')
var buffer        = require('buffer')
var connect       = require('connect')
var dispatch      = require('dispatch')

var HttpCode      = require('./HttpCode.js')
var Middlewares   = require('middlewares')
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

  this._passportInitialize = passport.initialize()

  this._buildDispatcher()

  var contentFolder = require('path').normalize(__dirname + '/../web')
  this._staticRequestHandler = connect.static(contentFolder)
}

ServiceRouter.prototype.registerService = function(service, conf) {
  this._services[service] = new Service(service, conf)
}

ServiceRouter.prototype._getServiceName = function(req) {
  return req.param('service') || 'local'
}

ServiceRouter.prototype._getService = function(req) {
  return this._services[this._getServiceName(req)]
}

ServiceRouter.prototype._authRequest = function(req, res, next) {
  var prefix = req.query && req.query.prefix
  var context = req.query && req.query.context

  if( prefix ) {
    res.seneca.cookies.set(self._options.transientPrefix + 'url-prefix', prefix)
  }

  if( context ) {
    res.seneca.cookies.set(self._options.transientPrefix + 'context', context)
  }

  var func
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
          context: req.seneca.cookies.get(self._options.transientPrefix + 'context'),
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

  self._passport.authenticate(self._getServiceName(req), self._getService(req).conf(), func)(req, res, next)
}

ServiceRouter.prototype._templatize = function(val) {
  return ':'+val
}

ServiceRouter.prototype._buildDispatcher = function() {

  var self = this;

  var routes = {}
  routes[this._options.urlpath.login]    = {
    GET: function(req, res, next) {
      self._authRequest(req, res, function(err) {
        self._afterLogin(err, next, req, res)
      })
    },
    POST: function(req, res, next) {
      req.query = _.extend({}, req.query||{}, req.body||{})

      // TODO: make general
      if( !req.query.username ) {
        req.query.username = null != req.query.nick ? req.query.nick : req.query.email
      }

      self._authRequest(req, res, function(err) {
        self._afterLogin(err, next, req, res)
      })
    },
  }
  routes[this._options.urlpath.logout] = function (req, res, next) {
    var clientToken = req.seneca.cookies.get(self._options.tokenkey)
    var serverToken
    res.seneca.cookies.set(self._options.tokenkey)

    if( req.seneca ) {
      serverToken = req.seneca.login && req.seneca.login.token
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


  routes['/auth/' + self._templatize('service')] = function (req, res, next) {
    self._authRequest(req, res, function (err) {
      if (err) return next(err)
    })
  }

  routes['/auth/' + self._templatize('service') + '/callback'] = function (req, res, next) {
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

  var self = this

  var httpMiddlewares = new Middlewares()

  httpMiddlewares.use(this._passportInitialize, this)
  httpMiddlewares.use(this._init_session, this)
  httpMiddlewares.use(this._restriction, this)
  httpMiddlewares.use(this._dispatcher, this)

  return function(req, res, next) {
    if( self._contentFilter.match(req) ) {
      req.url = req.url.substring(self._options.prefix.length)
      return self._staticRequestHandler( req, res ) // static stuff
    }

    if( self._options.defaultpages ) {
      var loginpage = _.reduce(self._options.loginpages, function(found, loginpage) {
        if( found ) return found
        if( req.url == loginpage.path ) return loginpage
      }, null)

      if( loginpage ) {
        req.url = '/login.html'
        return app( req, res ) // static stuff
      }
    }

    if( self._excludeFilter.match(req) && !self._includeFilter.match(req) ) {
      return next()
    }

    // TODO: assumes req.seneca exists, so has dependency on seneca-web
    req.seneca.cookies = new Cookies(req, res)

    httpMiddlewares.execute(req, res, next)
  }
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

      out.httpstatus$ = out.ok ? HttpCode.OK : HttpCode.BAD_REQUEST
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


ServiceRouter.prototype._restriction = function(req, res, next) {
  var service = this._getService(req)
  if( _.isFunction(service.conf().restrict) ) {

    service.conf().restrict(req, res, next)

  } else {
    var restrictFilter = new RequestFilter(service.conf().restrict)

    if(restrictFilter.match(req) && !(req.seneca && req.seneca.user) ) {

      var redirect = false
      var ct = (req.headers['content-type'] || '').split(';')[0]

      if( 'application/json' == ct ) {
        redirect = false
      } else {
        redirect = true
      }


      if( redirect ) {
        sendredirect( HttpCode.FOUND, res, service.conf().redirect.restrict )
      } else {
        res.writeHead(HttpCode.UNAUTHORIZED)
        res.end( JSON.stringify({ok: false, why: 'restricted'}) )
      }
    } else {
      next()
    }
  }
}


ServiceRouter.prototype._logerr = function(err) {
  if( err ) {
    return this._seneca.log('error', err)
  }
}

ServiceRouter.prototype._afterLogin = function(err, next, req, res) {
  if( err && !err.why ) return next(err)

  var service = this._getService(req)

  var self = this

  var context = req.seneca.cookies.get(service.conf().transientprefix + 'context')
  res.seneca.cookies.set(service.conf().transientprefix + 'context')

  var redirect = this._redirection(req, res, 'login')

  // req.user actually == {ok: , user: , login: }
  if( req.user && req.user.ok ) {
    // rename passport req.user prop
    req.seneca.user = req.user.user
    req.seneca.login = req.user.login

    this._adminLocal(req, req.seneca.user)

    res.seneca.cookies.set(service.conf().tokenkey, req.seneca.login.token)

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
    var out = {ok: false, why: err.why}
    if( redirect ) {
      req.seneca.log.debug('redirect', 'login', 'fail', redirect.fail)

      sendredirect( HttpCode.FOUND, res, redirect.fail )
    } else {
      sendjson(HttpCode.BAD_REQUEST, res, out)
    }
  }

}

ServiceRouter.prototype._do_respond = function(req, res, redirect, err) {
  if( err) return next(err)

  if( redirect ) {
    req.seneca.log.debug('redirect', 'login', 'win', redirect.win)
    sendredirect( HttpCode.FOUND, res, redirect.win )
  } else {
    // FIX: this should call instance
    // FIX: how to handle errors here?
    this._seneca.act({role: this._plugin, cmd: 'clean', user: req.seneca.user, login: req.seneca.login}, function(err, out) {

      out.ok = true


      // FIX: should be provided by seneca-web
      sendjson( HttpCode.OK, res, out )
    })
  }
}




ServiceRouter.prototype._adminLocal = function(req, user) {
  var service = this._getService(req)
  if( service.conf().admin.local
    && ( '127.0.0.1' === req.connection.remoteAddress ||
    '::1' === req.connection.remoteAddress ) )
  {
    user.admin = true
  }
}

ServiceRouter.prototype._init_session = function(req, res, cb) {

  var self = this;

  var service = this._getService(req)

  var token = req.seneca.cookies.get(service.conf().tokenkey)

  if( token ) {
    this._seneca.act({role: 'user', cmd: 'auth', token: token}, this._seneca.err(cb, function(out) {

      if( out.ok ) {
        req.user = {user: out.user, login: out.login}
        req.seneca.user = out.user
        req.seneca.login = out.login

        self._adminLocal(req, req.seneca.user)

        cb()
      }

      // dead login - get rid of the cookie
      else {
        res.seneca.cookies.set( service.conf().tokenkey )
        cb()
      }
    }))
  }
  else cb()
}

ServiceRouter.prototype._respond = function(err, res, redirect, data) {

  if( redirect ) {
    //res.redirect( redirect )
    sendredirect(HttpCode.FOUND, res, redirect)
  } else {
    var httpCode = HttpCode.OK
    if(_.isNumber(err)) {
      httpCode = err
    } else if(_.isObject(err)) {
      httpCode = HttpCode.INTERNAL_SERVER_ERROR
    } else if(!data.ok) {
      httpCode = HttpCode.BAD_REQUEST
    }
    sendjson(httpCode, res, data)
  }
}

// TODO: move to seneca-web
function sendredirect(code, res, url) {
  res.writeHead(HttpCode.MOVED_PERMANENTLY, {Location: url})
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
