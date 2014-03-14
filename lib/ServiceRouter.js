
var RequestFilter = require('./RequestFilter.js')

function ServiceRouter(options) {
  this._options = options
  this._excludeFilter = new RequestFilter(options.exclude)
  this._includeFilter = new RequestFilter(options.include)
  this._contentFilter = new RequestFilter(options.content)

  this._passportInitialize = passport.initialize()
}

Service.prototype._requestHandler = function(req, res, next) {
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

  this._passportInitialize(req, res, function(err) {
    if(err) return next(err)

    self._init_session(req, res, function(err) {
      if(err) return next(err)

      self._restriction(req, res, function(err) {
        if(err) return next(err)

        self._dispatcher(req, res, next)
      })

    })
  })
}

ServiceRouter.prototype.forwardRequestToService = function ( req, res, args, act, respond ) {
  var redirect = redirection(req, res, args.cmd)

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

function redirection(req, res, kind) {
  var transientprefix = req.seneca.cookies.get(options.transientprefix + 'url-prefix')
  req.seneca.cookies.set(options.transientprefix + 'url-prefix')

  transientprefix = req.query && void 0 != req.query.prefix ? req.query.prefix : transientprefix

  transientprefix = void 0 == transientprefix ? '' : '' + transientprefix


  var redirect = false
  var ct = (req.headers['content-type']||'').split(';')[0]

  if( options.redirect.always ) {
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
    var rk = options.redirect[kind]

    redirect = {
      win:  _.isString(req.query.win) ? req.query.win : transientprefix + ( (rk && rk.win)  || options.redirect.win ),
      fail: _.isString(req.query.fail) ? req.query.fail : transientprefix + ( (rk && rk.fail) || options.redirect.fail ),
    }
  }

  return redirect
}
