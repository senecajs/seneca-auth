
var dispatch = require('dispatch')

function routes() {

  var self = this;

  var routes = {}
  routes[this._options.urlpath.login] = {
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


  routes[self._options.prefix + '/' + self._templatize('service')] = function (req, res, next, service) {
    if(!req.params) {
      req.params = {}
    }
    req.params.service = service

    if(service !== self._options.urlpath.instance &&
      service !== self._options.urlpath.register &&
      service !== self._options.urlpath.reset_create &&
      service !== self._options.urlpath.reset_load &&
      service !== self._options.urlpath.reset_execute) {
      self._authRequest(req, res, function (err) {
        if (err) {
          return next(err)
        }
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

module.exports = routes
