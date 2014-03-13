
var gex      = require('gex')
var connect  = require('connect')

var HttpCode = require('./HttpCode.js')


function Service(options, plugin, seneca, passport, useract) {


  function adminLocal(req, user) {
    if( options.admin.local
      && ( '127.0.0.1' === req.connection.remoteAddress ||
      '::1' === req.connection.remoteAddress ) )
    {
      user.admin = true
    }
  }

  function respond(err, res, redirect, data) {
    if( redirect ) {
      //res.redirect( redirect )
      sendredirect(HttpCode.FOUND, res, redirect)
    }
    else {
      sendjson(
        _.isNumber(err) ? err
          : _.isObject(err) ? HttpCode.INTERNAL_SERVER_ERROR
          : void 0 != data.ok ?
          !data.ok ? HttpCode.BAD_REQUEST :
            HttpCode.OK : HttpCode.OK, res, data)
    }
  }

  function urlMatcher( spec ) {
    spec = _.isArray(spec) ? spec : [spec]
    var checks = []

    _.each(spec, function(path) {
      if( _.isFunction(path) ) return checks.push(path)
      if( _.isRegExp(path) ) return checks.push( function(req) { return path.test(req.url) } )
      if( !_.isString(path) ) return

      path = ~path.indexOf(':') ? path : 'prefix:' + path
      var parts = path.split(':')
      var kind  = parts[0]
      var spec  = parts.slice(1)

      function regex() {
        var pat = spec, mod = '', re
        var m = /^\/(.*)\/([^\/]*)$/.exec(spec)
        if(m) {
          pat = m[1]
          mod = m[2]
          re = new RegExp(pat, mod)
          return function(req) {return re.test(req.url)}
        } else {
          return function() {return false}
        }
      }

      var pass = {
        prefix:   function(req) { return gex(spec + '*').on(req.url) },
        suffix:   function(req) { return gex('*' + spec).on(req.url) },
        contains: function(req) { return gex('*' + spec + '*').on(req.url) },
        gex:      function(req) { return gex(spec).on(req.url) },
        exact:    function(req) { return spec === req.url },
        regex:    regex()
      }
      pass.re = pass.regexp = pass.regex
      checks.push(pass[kind])
    })

    return checks
  }

  function checkUrl(match) {
    var checks = urlMatcher(match)
    return function(req) {
      for( var i = 0; i < checks.length; i++ ) {
        if( checks[i](req) ) return true
      }
      return false
    }
  }

  var exclude_url = checkUrl(options.exclude)
  var include_url = checkUrl(options.include)
  var content_url = checkUrl(options.content)

  var pp_init = passport.initialize()

  var pp_auth = {}
  _.each( options.service, function(conf, service) {

    var conf = _.extend({}, options.service[service].authconf||{})
    var func = null


    pp_auth[service] = function(req, res, next) {
      var prefix = req.query && req.query.prefix
      var context = req.query && req.query.context

      if( prefix ) {
        res.seneca.cookies.set(options.transientprefix + 'url-prefix', prefix)
      }

      if( context ) {
        res.seneca.cookies.set(options.transientprefix + 'context', context)
      }

      if (service != 'local') {
        if (!options.service[service].action || options.service[service].action == 'login') {
          func = function (err, user, info) {
            seneca.act(_.extend({}, user, {role: 'auth', trigger: 'service-login', service: service}),
              function (err, user) {
                if (err) return afterlogin(err, next, req, res)

                seneca.act({role: 'user', cmd: 'login', nick: user.nick, auto: true}, function (err, out) {
                  req.user = out
                  afterlogin(err, next, req, res)
                })
              }
            )
          }
        } else {
          func = function (err, data, info) {
            seneca.act({role: 'auth', trigger: 'service-' + options.service[service].action, service: service,
                context: req.seneca.cookies.get(options.transientprefix + 'context'),
                data: data
              },

              // FIX: should call afterlogin and use options for redirect

              function (err, redirect) {
                if (err) return next(err)
                //res.redirect(redirect)
                sendredirect(HttpCode.FOUND, res, redirect)
              }
            )
          }
        }
      }

      passport.authenticate(service, conf, func)(req, res, next)
    }
  })



  function init_session(req, res, cb) {
    //var token = req.cookies[options.tokenkey]
    var token = req.seneca.cookies.get(options.tokenkey)

    if( token ) {
      useract.auth({token: token}, seneca.err(cb, function(out) {

        if( out.ok ) {
          req.user = {user: out.user, login: out.login}
          req.seneca.user = out.user
          req.seneca.login = out.login

          adminLocal(req, req.seneca.user)

          cb()
        }

        // dead login - get rid of the cookie
        else {
          res.seneca.cookies.set( options.tokenkey )
          cb()
        }
      }))
    }
    else cb()
  }



  var restriction = (function() {
    if( _.isFunction(options.restrict) ) return options.restrict

    var checks = urlMatcher(options.restrict)

    return function(req, res, next) {
      for( var cI = 0; cI < checks.length; cI++ ) {
        var restrict = checks[cI](req)
        if( restrict && !(req.seneca && req.seneca.user) ) {


          var redirect = false
          var ct = (req.headers['content-type']||'').split(';')[0]

          if( 'application/json' == ct ) {
            redirect = false
          } else {
            redirect = true
          }


          if( redirect ) {
            sendredirect( HttpCode.FOUND, res, options.redirect.restrict )
          } else {
            res.writeHead(HttpCode.UNAUTHORIZED)
            res.end( JSON.stringify({ok: false, why: 'restricted'}) )
          }
          break
        }
      }
      if( cI == checks.length ) next()
    }
  })()





  function logerr(err) {
    if( err ) return seneca.log('error', err)
  }



  function afterlogin(err, next, req, res) {
    if( err && !err.why ) return next(err)

    var context = req.seneca.cookies.get(options.transientprefix + 'context')
    res.seneca.cookies.set(options.transientprefix + 'context')

    var redirect = redirection(req, res, 'login')

    // req.user actually == {ok: , user: , login: }
    if( req.user && req.user.ok ) {
      // rename passport req.user prop
      req.seneca.user = req.user.user
      req.seneca.login = req.user.login

      adminLocal(req, req.seneca.user)

      res.seneca.cookies.set(options.tokenkey, req.seneca.login.token)

      if( '' != context ) {
        req.seneca.login.context = context
        req.seneca.login.save$(do_respond)
      } else {
        do_respond()
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


    function do_respond(err) {
      if( err) return next(err)

      if( redirect ) {
        req.seneca.log.debug('redirect', 'login', 'win', redirect.win)
        sendredirect( HttpCode.FOUND, res, redirect.win )
      } else {
        // FIX: this should call instance
        // FIX: how to handle errors here?
        seneca.act({role: plugin, cmd: 'clean', user: req.seneca.user, login: req.seneca.login}, function(err, out) {

          out.ok = true


          // FIX: should be provided by seneca-web
          sendjson( HttpCode.OK, res, out )
        })
      }
    }
  }





  var route_login = {
    GET: function(req, res, next) {
      pp_auth.local(req, res, function(err) {
        afterlogin(err, next, req, res)
      })
    },
    POST: function(req, res, next) {
      req.query = _.extend({}, req.query||{}, req.body||{})

      // TODO: make general
      if( !req.query.username ) {
        req.query.username = null != req.query.nick ? req.query.nick : req.query.email
      }

      pp_auth.local(req, res, function(err) {
        afterlogin(err, next, req, res)
      })
    },
  }


  function route_logout(req, res, next) {
    var clienttoken = req.seneca.cookies.get(options.tokenkey)
    var servertoken
    res.seneca.cookies.set(options.tokenkey)

    if( req.seneca ) {
      servertoken = req.seneca.login && req.seneca.login.token
      delete req.seneca.user
      delete req.seneca.login
    }

    if( clienttoken ) {
      useract.logout({token: clienttoken}, logerr)
    }

    if( servertoken && servertoken != clienttoken ) {
      seneca.log('auth', 'token-mismatch', clienttoken, servertoken)
      useract.logout({token: servertoken}, logerr)
    }

    try { req.logout() } catch(err) { logerr(err) }

    var redirect = redirection(req, res, 'logout')

    respond(null, res, redirect.win, {ok: true})
  }






  var routes = {}
  routes[options.urlpath.login]    = route_login
  routes[options.urlpath.logout]   = route_logout





  _.each(options.service, function (conf, service) {

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
          afterlogin(undefined, next, req, res)
        }
      })
    }
  })


  var dispatcher = dispatch(routes)

  var contentfolder = require('path').normalize(__dirname + '/../web')
  var app = connect().use(connect.static(contentfolder))

  return function(req, res, next) {
    if( content_url(req) ) {
      req.url = req.url.substring(options.prefix.length)
      return app( req, res )
    }

    if( options.defaultpages ) {
      var loginpage = _.reduce(options.loginpages, function(found, loginpage) {
        if( found ) return found
        if( req.url == loginpage.path ) return loginpage
      }, null)

      if( loginpage ) {
        req.url = '/login.html'
        return app( req, res )
      }
    }

    if( exclude_url(req) && !include_url(req) ) {
      return next()
    }

    // TODO: assumes req.seneca exists, so has dependency on seneca-web
    req.seneca.cookies = new Cookies(req, res)

    pp_init(req, res, function(err) {
      if( err) return next(err)

      init_session(req, res, function(err) {
        if( err) return next(err)

        restriction(req, res, function(err) {
          if( err) return next(err)

          dispatcher(req, res, next)
        })

      })
    })
  }
}

// TODO: move to seneca-web
function sendredirect(code, res, url) {
  res.writeHead(HttpCode.MOVED_PERMANENTLY, {Location: url})
  res.end()
}

module.export = Service
