/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
"use strict";


var util          = require( 'util' )
var _             = require( 'lodash' )
var passport      = require( 'passport' )

var seneca_auth_token
  = require( 'seneca-auth-token-cookie' )
var seneca_auth_redirect
  = require( 'seneca-auth-redirect' )
var seneca_auth_urlmatcher
  = require( 'seneca-auth-urlmatcher' )

var default_options
  = require( './default-options.js' )
var error         = require( 'eraro' )({
  package: 'auth'
})


module.exports = function auth( options ) {
  var seneca = this

  seneca.depends('auth',['web','user'])

  // using seneca.util.deepextend here, as there are sub properties
  options = seneca.util.deepextend( default_options, options )

  function migrate_options(){
    if ( options.service || options.sendemail || options.email ) {
      throw error( "<" + (options.service ? 'service': (options.sendemail ? 'sendemail': 'email')) +
        "> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth" )
    }

    if ( options.tokenkey ) {
      seneca.log( '<tokenkey> option is deprecated, please check seneca-auth documentation for migrating to new version of seneca-auth' )
    }
  }
  migrate_options()
  load_default_plugins()

  var m
  if( (m = options.prefix.match(/^(.*)\/+$/)) ) {
    options.prefix = m[1]
  }

  // define seneca actions
  // seneca.add({ role:'auth', wrap:'user' },      wrap_user)
  seneca.add( { init:'auth' },                   init )

  seneca.add( {role:'auth',cmd:'register'},      cmd_register )
  seneca.add( {role:'auth',cmd:'user'},          cmd_user )
  seneca.add( {role:'auth',cmd:'instance'},      cmd_user )
  seneca.add( {role:'auth',cmd:'clean'},         cmd_clean )

  seneca.add( {role:'auth',cmd:'create_reset'},  cmd_create_reset )
  seneca.add( {role:'auth',cmd:'load_reset'},    cmd_load_reset )
  seneca.add( {role:'auth',cmd:'execute_reset'}, cmd_execute_reset )
  seneca.add( {role:'auth',cmd:'confirm'},       cmd_confirm )

  seneca.add( {role:'auth',cmd:'update_user'},    cmd_update_user )
  seneca.add( {role:'auth',cmd:'change_password'},cmd_change_password )

  seneca.add( {role: 'auth', cmd:'login'},        cmd_login )
  seneca.add( {role: 'auth', cmd:'logout'},       cmd_logout )

  seneca.add( {role: 'auth', cmd:'register_service' },
    cmd_register_service )

  seneca.add( {role: 'auth', cmd: 'map_fields'},    alias_fields )

  function load_default_plugins(){
    seneca.use(seneca_auth_token)
    seneca.use(seneca_auth_redirect, options.redirect || {})
    seneca.use(seneca_auth_urlmatcher)
  }

  function checkurl( match, cb ) {
    seneca.act( {role:'auth', cmd: 'urlmatcher', spec: match}, function( err, checks ){
      return cb (null, function( req ) {
        for( var i = 0; i < checks.length; i++ ) {
          if( checks[i](req) ) {
            return true
          }
        }
        return false
      })
    } )
  }

  var exclude_url
  checkurl( options.exclude, function( err, response ) {
    exclude_url = response
  })

  var include_url
  checkurl( options.include, function( err, response ) {
    include_url = response
  })

  var checks
  if( !_.isFunction(options.restrict) ) {
    seneca.act( {role:'auth', cmd: 'urlmatcher', spec: options.restrict}, function( err, result ) {
      checks = result
    })
  }

  passport.serializeUser( function( user, done ) {
    done( null, user.user.id );
  })

  passport.deserializeUser( function( id, done ) {
    done( null )
  })

  // default service login trigger
  function trigger_service_login( args, done ) {
    var seneca = this

    if ( !args.user ){
      return done( null, {ok: false, why: 'no-user'} )
    }

    var user_data = args.user
    var q = {}
    if( user_data.identifier ) {
      q[ args.service + '_id' ] = user_data.identifier
      user_data[args.service + '_id'] = user_data.identifier
    }
    else {
      return done( null, {ok: false, why: 'no-identifier'} )
    }

    seneca.act(_.extend( {role: 'user', get: 'user'}, q ), function( err, data ) {
      if( err ) return done( null, {ok: false, why: 'no-identifier'} );

      if( !data.ok ) return done( null, {ok: false, why: data.why} );

      var user = data.user
      if( !user ) {
        seneca.act( _.extend( {role:'user',cmd:'register'}, user_data ), function( err, out ) {
          if( err ) {
            return done( null, {ok: false, why: err} )
          }

          done( null, out.user )
        })
      }
      else {
        seneca.act( _.extend( {role:'user',cmd:'update'}, user_data ), function( err, out ) {
          if( err ) {
            return done( null, {ok: false, why: err} )
          }

          done( null, out.user )
        })
      }
    })
  }

  function cmd_register_service( args, cb ) {
    seneca.log.info( 'registering auth service [' + args.service + ']' )
    passport.use( args.service, args.plugin )
    registerService( args.service, args.conf )
    cb()
  }

  function registerService( service, conf ) {
    seneca.add( {role: 'auth', cmd: 'auth-' + service}, _login_service.bind( this, service ) )
    seneca.add( {role: 'auth', cmd: 'auth-' + service + '-callback'}, _service_callback.bind( this, service ) )

    var map = {}
    map['auth-' + service] = {GET: true, POST: true, alias: '/' + service, responder: _blank_responder}
    map['auth-' + service + '-callback'] = {GET: true, POST: true, alias: '/' + service + '/callback'}

    seneca.act( {
      role:'web',
      plugin:'auth',
      config:config,
      use:{
        prefix:options.prefix,
        pin:{role:'auth',cmd:'*'},
        map: map
      }
    } )

    seneca.add( { role:'auth', trigger:'service-login-' + service }, trigger_service_login )
    configure_services( service, conf )
  }

//  function wrap_user( args, done ) {
//    this.act({
//      role:'util',
//      cmd:'ensure_entity',
//      pin:args.pin,
//      entmap:{
//        user:userent
//      }
//    })
//
//    this.wrap(args.pin, function( args, done ){
//      args.user = args.user || (args.req$ && args.req$.seneca && args.req$.seneca.user ) || null
//      this.parent(args,done)
//    })
//
//    done()
//  }
//
  function alias_fields( userData, cb ){
    var data = userData.data
    data.nick =
      data.nick ?
        data.nick :
        data.username ?
          data.username :
          data.email
    return cb( null, data )
  }

  function cmd_register( args, done ) {
    var seneca = this
    seneca.act( {role: 'auth', cmd: 'map_fields', action: 'register', data: args.data}, function( err, details ) {
      var req = args.req$
      var res = args.res$

      seneca.act( _.extend( {role:'user',cmd:'register'}, details ), function( err, out ) {
        if( err || !out.ok ) {
          return do_respond( err || (out ? out.why: 'Internal server error'), 'register', req, done )
        }

        seneca.act( _.extend( {role:'user',cmd:'login'}, { nick:out.user.nick, auto:true } ), function( err, out ) {
          if( err || !out.ok ) {
            return do_respond( err || (out ? out.why: 'Internal server error'), 'register', req, done )
          }

          if( req && req.seneca ) {
            req.seneca.user  = out.user
            req.seneca.login = out.login

            req.seneca.act( {role: 'auth', set: 'token', tokenkey: options.tokenkey, token: req.seneca.login.id}, function( err ) {
              return do_respond( err, 'register', req, done )
            })
          }
          else{
            done(null, {
              ok:    out.ok,
              user:  out.user,
              login: out.login
            } )
          }
        })
      })
    })
  }

  function cmd_create_reset( args, done ) {
    seneca.act( {role: 'auth', cmd: 'map_fields', action: 'create_reset', data: args.data}, function( err, userData ) {
      var nick  = userData.nick
      var email = userData.email

      var args = {}
      if( void 0 != nick )  args.nick  = nick;
      if( void 0 != email ) args.email = email;

      seneca.act( _.extend( {role:'user',cmd:'create_reset'}, args ), done )
    })
  }

  function cmd_load_reset( args, done ) {
    var token = args.data.token

    seneca.act( {role:'user',cmd:'load_reset', token:token}, function( err, out ) {
      if( err || !out.ok ) {
        return done( err, out );
      }

      return done( null, {
        ok: out.ok,
        nick: out.user.nick
      } )
    } )
  }


  function cmd_execute_reset( args, done ) {
    var token    = args.data.token
    var password = args.data.password
    var repeat   = args.data.repeat

    seneca.act( {role:'user',cmd:'execute_reset', token:token, password:password, repeat:repeat}, done )
  }


  function cmd_confirm( args, done ) {
    var code = args.data.code

    seneca.act( {role:'user',cmd:'confirm', code:code}, done )
  }

  function cmd_update_user( args, done ) {
    seneca.act({role: 'auth', cmd: 'map_fields', action: 'update', data: args.data}, function(err, userData){
      seneca.act(_.extend({role:'user',cmd:'update'}, userData), done)
    })
  }

  function cmd_change_password( args, done ) {
    var user = args.user

    seneca.act({role:'user',cmd:'change_password', user:user, password:args.data.password, repeat:args.data.repeat }, done )
  }

  function cmd_user( args, done ) {
    var seneca = this

    var user  = args.user
    var login = args.login

    if ( !user || !login || !login.active ) {
      return done( null, {ok: true} )
    }

    seneca.act( { role:'auth', cmd:'clean', user:user, login:login}, function( err, out ) {
      if( err ) {
        return done( err );
      }

      out.ok = true
      out = seneca.util.clean( out )

      return done( null, out )
    })
  }

  function cmd_clean( args, done ) {
    var seneca = this

    var user  = args.user  && seneca.util.clean( args.user.data$() )  || null
    var login = args.login && seneca.util.clean( args.login.data$() ) || null

    if( user ) {
      delete user.pass
      delete user.salt
      delete user.active
      delete user.accounts
      delete user.confirmcode
      delete user.repeat
    }

    return done( null,{ user:user, login:login } )
  }

  var pp_auth = {}

  function configure_services( service, conf ){
    conf = conf || {}
    var func = null

    pp_auth[service] = function( req, res, next ) {
      if ( service != 'local' ) {
        func = function ( err, user, info ) {
          if ( err ) {
            return afterlogin( err, next, req, res )
          }
          seneca.act( _.extend( {}, {role: 'auth', trigger: 'service-login-' + service, service: service, user: user} ),
            function ( err, user ) {
              if ( err ) {
                return afterlogin( err, next, req, res );
              }

              seneca.act( {role: 'user', cmd: 'login', nick: user.nick, auto: true}, function ( err, out ) {
                req.user = out
                afterlogin( err, next, req, res )
              })
            }
          )
        }
      }

      passport.authenticate( service, conf, func )( req, res, next )
    }
  }

  function buildservice() {
    var pp_init = passport.initialize()

    function init_session( req, res, cb ) {
      req.seneca.act( {role: 'auth', get: 'token', tokenkey: options.tokenkey}, function( err, result ) {
        var token
        if ( result ) {
          token = result.token
        }

        if( token ) {
          seneca.act( {role:'user',cmd:'auth', token:token}, function( err, out ) {
            if( err ) {
              return cb( err );
            }

            if( out.ok ) {
              req.user = { user:out.user, login:out.login }
              req.seneca.user = out.user
              req.seneca.login = out.login

              return cb();
            }
            else {
              // dead login - get rid of the token
              req.seneca.act( {role: 'auth', set: 'token', tokenkey: options.tokenkey}, function() {
                return cb();
              } )

            }
          })
        }
        else {
          return cb();
        }
      })
    }

    var restriction = ( function() {
      if( _.isFunction( options.restrict ) ) return options.restrict;

      return function( req, res, next ) {
        for( var cI = 0; cI < checks.length; cI++ ) {
          var restrict = checks[cI](req)
          if( restrict && !( req.seneca && req.seneca.user ) ) {
            req.seneca.act( {role: 'auth', cmd: 'redirect', kind: req.url}, function( err, redirect ) {
              if( redirect ) {
                return next( {http$: {status: 302,redirect:options.redirect.restrict}} )
              }
              else {
                return next( { ok:false, why:'restricted', http$: {status: 401} } )
              }
            } )
            break;
          }
        }
        if( cI == checks.length ) {
          next();
        }
      }
    })();

    return function( req, res, next ) {
      if( exclude_url( req ) && !include_url( req ) ) {
        return next()
      }

      if ( !req.seneca ) {
        return next( 'Cannot process, seneca-web dependency problem' );
      }

      pp_init( req, res, function( err ){
        if( err ) {
          return next( err );
        }

        init_session( req, res, function( err ){
          if( err ) {
            return next( err );
          }

          restriction( req, res, next )
        })
      })
    }
  }


  function init( args, done ) {
    done()
  }

  function authcontext( req, res, args, act, respond ) {
    var user = req.seneca && req.seneca.user
    if( user ) {
      args.user = user
    }

    var login = req.seneca && req.seneca.login
    if( login ) {
      args.login = login
    }

    act( args, function( err, out ) {
      if( err ) {
        seneca.log.debug(err)
        out = out || {}

        return respond( null, out );
      }

      return respond( null,out )
    })
  }

  var config = { prefix:options.prefix, redirects:{} }


  function do_respond( err, action, req, next, forceStatus, forceRedirect ) {
    req.seneca.act( {role: 'auth', cmd: 'redirect', kind: action}, function( errRedirect, redirect ) {
      if( err ) {
        if( redirect ) {
          req.seneca.log.debug( 'redirect', 'fail', redirect.fail )
          return next( null, {http$: {status: forceStatus || 301, redirect:forceRedirect || redirect.fail}} )
        }
        else {
          return next( null, {http$: {status: forceStatus || 200, redirect:forceRedirect}, ok: false, why: err} )
        }
      }
      else{
        if( redirect ) {
          req.seneca.log.debug( 'redirect', 'win', redirect.win )
          return next( null, {http$: {status: forceStatus || 301,redirect:forceRedirect || redirect.win}} )
        }
        else {
          seneca.act( {role:'auth', cmd:'clean', user:req.seneca.user, login:req.seneca.login}, function( err, out ) {
            out.ok = true
            out.http$ = { status: forceStatus || 200, redirect:forceRedirect }
            return next( null, out )
          })
        }
      }
    })
  }

//LOGIN START
  function afterlogin( err, next, req, res ) {
    if( err ) {
      return do_respond( err, 'login', req, next )
    }

    if( req.user && req.user.ok ) {
      // rename passport req.user prop
      req.seneca.user = req.user.user
      req.seneca.login = req.user.login

      req.seneca.act( {role: 'auth', set: 'token', tokenkey: options.tokenkey, token: req.seneca.login.id}, function() {
        return do_respond( null, 'login', req, next )
      } )
    }
    else {
      do_respond( ( err ? err.why : 'Unknown error' ), 'login', req, next )
    }
  }

  function cmd_login( args, next ) {
    var req = args.req$
    var res = args.res$

    req.query = _.extend( {}, req.query || {}, req.body || {} )

    seneca.act( {role: 'auth', cmd: 'map_fields', action: 'login', data: args.data}, function( err, userData ) {
      req.query.username =
        req.query.username ?
          req.query.username :
          (
            req.query.nick ?
              req.query.nick :
              (
                userData.username ?
                  userData.username :
                  userData.nick
                )
            )


      pp_auth.local( req, res, function ( loginerr, out ) {
        req.seneca.act( {role: 'auth', restrict: 'login', default$: {ok: true, why: 'no-restrict'}}, function( err, out ) {
          if ( loginerr || err || !( out && out.ok ) ){
            do_respond( loginerr || err || ( out && out.why ), 'login', req, next )
          }
          else{
            afterlogin( err, next, req, res )
          }
        })
      })
    })
  }
//LOGIN END


//LOGOUT START
  function cmd_logout( args, next ) {
    var req = args.req$
    var res = args.res$

    // get token from request
    req.seneca.act( {role: 'auth', get: 'token', tokenkey: options.tokenkey}, function( err, clienttoken ) {
      clienttoken = clienttoken.token
      // delete token
      req.seneca.act( {role: 'auth', set: 'token', tokenkey: options.tokenkey}, function() {
        var servertoken
        if( req.seneca ) {
          servertoken = req.seneca.login && req.seneca.login.token
          delete req.seneca.user
          delete req.seneca.login
        }

        var token = clienttoken || servertoken || ''
        seneca.act( {role:'user',cmd:'logout', token: token}, function( err ) {
          if( err ) {
            seneca.log( 'error', err )

            return do_respond( err, 'logout', req, next )
          }

          try {
            req.logout()
          } catch( err ) {
            seneca.log( 'error', err )
            return do_respond( err, 'logout', req, next )
          }

          return do_respond( err, 'logout', req, next )
        } )
      } )
    } )
  }

//LOGOUT END


  // seneca web endpoints map
  var map = {
    login:           { POST: true, GET: true, data: true, alias: options.urlpath.login},
    logout:          { POST: true, GET: true, data: true, alias: options.urlpath.logout},
    register:        { POST:authcontext, data:true, alias: options.urlpath.register},
    user:            { GET: authcontext,            alias: options.urlpath.user},
    instance:        { GET: authcontext,            alias: options.urlpath.instance},// this is deprecated - use user instead
    create_reset:    { POST:authcontext, data:true, alias: options.urlpath.create_reset },
    load_reset:      { POST:authcontext, data:true, alias: options.urlpath.load_reset },
    execute_reset:   { POST:authcontext, data:true, alias: options.urlpath.execute_reset },
    confirm:         { POST:authcontext, data:true, alias: options.urlpath.confirm },
    update_user:     { POST:authcontext, data:true, alias: options.urlpath.update_user },
    change_password: { POST:authcontext, data:true, alias: options.urlpath.change_password }
  }

  var _login_service = function ( service, args, next ) {
    var req = args.req$
    var res = args.res$
    pp_auth[service]( req, res, function ( err ) {
    } )
    next()
  }

  var _blank_responder = function( req, res, err, out ) {
    // no need to do anything here as all response data is set by passport strategy
  }

  var _service_callback = function ( service, args, next ) {
    var req = args.req$
    var res = args.res$
    pp_auth[service]( req, res, next )
  }

  seneca.act( {
    role:'web',
    plugin:'auth',
    config:config,
    use:{
      prefix:options.prefix,
      pin:{ role:'auth', cmd:'*' },
      startware:buildservice(),
      map: map
    }
  } )

  return {
    name:'auth'
  }
}
