
var gex      = require('gex')
var buffer   = require('buffer')
var connect  = require('connect')
var dispatch = require('dispatch')

var HttpCode = require('./HttpCode.js')


function Service(service, conf, plugin, seneca) {
  this._conf = conf
  this._seneca = seneca
  this._plugin = plugin
  this._service = service

  var self = this;

  var exclude_url = checkUrl(conf.exclude)
  var include_url = checkUrl(conf.include)
  var content_url = checkUrl(conf.content)

  var pp_auth = {}

  var conf = _.extend({}, conf.authconf || {})
  var func = null



}

Service.prototype.conf = function() {
  return this._conf
}

Service.prototype._restriction = function(req, res, next) {

  if( _.isFunction(this._conf.restrict) ) {

    this._conf.restrict.(req, res, next)

  } else {

    var checks = urlMatcher(this._conf.restrict)
    for( var cI = 0; cI < checks.length; cI++ ) {
      var restrict = checks[cI](req)
      if( restrict && !(req.seneca && req.seneca.user) ) {


        var redirect = false
        var ct = (req.headers['content-type'] || '').split(';')[0]

        if( 'application/json' == ct ) {
          redirect = false
        } else {
          redirect = true
        }


        if( redirect ) {
          sendredirect( HttpCode.FOUND, res, this._conf.redirect.restrict )
        } else {
          res.writeHead(HttpCode.UNAUTHORIZED)
          res.end( JSON.stringify({ok: false, why: 'restricted'}) )
        }
        break
      }
    }
    if( cI == checks.length ) next()
  }
}


Service.prototype._logerr = function(err) {
  if( err ) {
    return this._seneca.log('error', err)
  }
}

Service.prototype._afterLogin = function(err, next, req, res) {
  if( err && !err.why ) return next(err)

  var self = this

  var context = req.seneca.cookies.get(this._conf.transientprefix + 'context')
  res.seneca.cookies.set(this._conf.transientprefix + 'context')

  var redirect = redirection(req, res, 'login')

  // req.user actually == {ok: , user: , login: }
  if( req.user && req.user.ok ) {
    // rename passport req.user prop
    req.seneca.user = req.user.user
    req.seneca.login = req.user.login

    this._adminLocal(req, req.seneca.user)

    res.seneca.cookies.set(this._conf.tokenkey, req.seneca.login.token)

    if( '' != context ) {
      req.seneca.login.context = context
      req.seneca.login.save$(function(err) {
        self._do_respond(req, res, redirect, err)
      })
    } else {
      self._do_respond(req, res, redirect, undefined)
    }
  }
  else {
    //var out = {ok: false, why: (req.user&&req.user.why)||'no-user'}
    //delete req.user
    var out = {ok: false, why: err.why}
    if( redirect ) {
      req.seneca.log.debug('redirect', 'login', 'fail', redirect.fail)

      sendredirect( HttpCode.FOUND, res, redirect.fail )
    }
    else {
      sendjson(HttpCode.BAD_REQUEST, res, out)
    }
  }

}

Service.prototype._do_respond = function(req, res, redirect, err) {
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




Service.prototype._adminLocal = function(req, user) {
  if( this._conf.admin.local
    && ( '127.0.0.1' === req.connection.remoteAddress ||
    '::1' === req.connection.remoteAddress ) )
  {
    user.admin = true
  }
}

Service.prototype._init_session = function(req, res, cb) {
  var self = this;

  var token = req.seneca.cookies.get(this._conf.tokenkey)

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
        res.seneca.cookies.set( self._conf.tokenkey )
        cb()
      }
    }))
  }
  else cb()
}

Service.prototype._respond = function(err, res, redirect, data) {
  if( redirect ) {
    //res.redirect( redirect )
    sendredirect(HttpCode.FOUND, res, redirect)
  } else {
    sendjson(
      _.isNumber(err) ? err
        : _.isObject(err) ? HttpCode.INTERNAL_SERVER_ERROR
        : void 0 != data.ok ?
        !data.ok ? HttpCode.BAD_REQUEST :
          HttpCode.OK : HttpCode.OK, res, data)
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

module.export = Service
