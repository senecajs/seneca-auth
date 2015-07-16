/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
"use strict";


var util          = require('util')
var _             = require('lodash')
var async         = require('async')
var S             = require('string')
var gex           = require('gex')
var Cookies       = require('cookies')
var passport      = require('passport')
var seneca_auth_token
  = require('seneca-auth-token-cookie')
var seneca_auth_redirect
  = require('seneca-auth-redirect')
var default_options
  = require('./default-options.js')
var error         = require('eraro')({
  package: 'auth'
})


module.exports = function auth( options ) {
  var seneca = this
  var plugin = 'auth'

  seneca.depends(plugin,['web','user'])

  // using seneca.util.deepextend here, as there are sub properties
  options = seneca.util.deepextend( default_options, options )

  function migrateOptions(){
    if (options.service){
      throw error('<service> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }
    if (options.sendemail){
      throw error('<sendemail> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }
    if (options.email){
      throw error('<email> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }
    if (options.tokenkey){
      seneca.log('<tokenkey> option is deprecated, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }
  }
  migrateOptions()
  loadDefaultPlugins()

  var m
  if( (m = options.prefix.match(/^(.*)\/+$/)) ) {
    options.prefix = m[1]
  }

//  _.each(options.urlpath,function(v,k){
//    options.urlpath[k] = '/'==v[0] ? v : options.prefix+'/'+v
//  })


  // define seneca actions
  seneca.add({ role:plugin, wrap:'user' },      wrap_user)
  seneca.add({ init:plugin },                   init)

  seneca.add({role:plugin,cmd:'register'},      cmd_register)
  seneca.add({role:plugin,cmd:'instance'},      cmd_instance)
  seneca.add({role:plugin,cmd:'clean'},         cmd_clean)

  seneca.add({role:plugin,cmd:'create_reset'},  cmd_create_reset)
  seneca.add({role:plugin,cmd:'load_reset'},    cmd_load_reset)
  seneca.add({role:plugin,cmd:'execute_reset'}, cmd_execute_reset)
  seneca.add({role:plugin,cmd:'confirm'},       cmd_confirm)

  seneca.add({role:plugin,cmd:'update_user'},    cmd_update_user)
  seneca.add({role:plugin,cmd:'change_password'},cmd_change_password)

  seneca.add({role: plugin, cmd:'login'},        cmd_login)
  seneca.add({role: plugin, cmd:'logout'},       cmd_logout)

  seneca.add({role: plugin, cmd:'register_service' },
    cmd_register_service)

  seneca.add({role: plugin, cmd: 'mapFields'},    aliasfields)

  function loadDefaultPlugins(){
    seneca.use(seneca_auth_token)
    seneca.use(seneca_auth_redirect, options.redirect || {})
  }

  function urlmatcher( spec ) {
    spec = _.isArray(spec) ? spec : [spec]
    var checks = []

    _.each(spec,function(path){
      if( _.isFunction(path) ) return checks.push(path);
      if( _.isRegExp(path) ) return checks.push( function(req) { return path.test(req.url) } );
      if( !_.isString(path) ) return;

      path = ~path.indexOf(':') ? path : 'prefix:'+path
      var parts = path.split(':')
      var kind  = parts[0]
      var spec  = parts.slice(1)

      function regex() {
        var pat = spec, mod = '', re
        var m = /^\/(.*)\/([^\/]*)$/.exec(spec)
        if(m) {
          pat = m[1]
          mod = m[2]
          re = new RegExp(pat,mod)
          return function(req){return re.test(req.url)}
        }
        else return function(){return false};
      }

      var pass = {
        prefix:   function(req) { return gex(spec+'*').on(req.url) },
        suffix:   function(req) { return gex('*'+spec).on(req.url) },
        contains: function(req) { return gex('*'+spec+'*').on(req.url) },
        gex:      function(req) { return gex(spec).on(req.url) },
        exact:    function(req) { return spec === req.url },
        regex:    regex()
      }
      pass.re = pass.regexp = pass.regex
      checks.push(pass[kind])
    })

    return checks
  }

  function checkurl( match ) {
    var checks = urlmatcher( match )
    return function(req) {
      for( var i = 0; i < checks.length; i++ ) {
        if( checks[i](req) ) {
          return true
        }
      }
      return false
    }
  }

  var exclude_url = checkurl(options.exclude)
  var include_url = checkurl(options.include)

  var userent = seneca.make$('sys/user')

  passport.serializeUser(function(user, done) {
    done(null, user.user.id);
  })

  passport.deserializeUser(function(id, done) {
    done(null)
  })

  // default service login trigger
  function trigger_service_login( args, done ) {
    var seneca = this

    if (!args.user){
      return done( null, {ok: false, why: 'no-user'} )
    }

    var userData = args.user
    var q = {}
    if( userData.identifier ) {
      q[ args.service + '_id' ] = userData.identifier
    }
    else {
      return done( null, {ok: false, why: 'no-identifier'} )
    }

    userent.load$(q,function(err,user){
      if( err ) return done( null, {ok: false, why: 'no-identifier'} );

      if( !user ) {
        seneca.act(_.extend({role:'user',cmd:'register'}, userData), function(err,out){
          if( err ) {
            return done( null, {ok: false, why: err} )
          }

          done( null, out.user )
        })
      }
      else {
        user.data$( seneca.util.deepextend( user.data$(), userData) )
        user.save$( done )
      }
    })
  }

  function cmd_register_service(args, cb) {
    seneca.log.info('registering auth service [' + args.service + ']')
    passport.use(args.service, args.plugin)
    registerService(args.service, args.conf)
    cb()
  }

  function registerService(service, conf){
    seneca.add({role: plugin, cmd: 'auth-' + service}, _login_service.bind(this, service))
    seneca.add({role: plugin, cmd: 'auth-' + service + '-callback'}, _service_callback.bind(this, service))

    var map = {}
    map['auth-' + service] = {GET: true, POST: true, alias: '/' + service, responder: _blank_responder}
    map['auth-' + service + '-callback'] = {GET: true, POST: true, alias: '/' + service + '/callback'}

    seneca.act({
      role:'web',
      plugin:plugin,
      config:config,
      use:{
        prefix:options.prefix,
        pin:{role:plugin,cmd:'*'},
        map: map
      }
    })

    seneca.add({ role:plugin, trigger:'service-login-' + service }, trigger_service_login)
    configureServices(service, conf)
  }

  function wrap_user( args, done ) {
    this.act({
      role:'util',
      cmd:'ensure_entity',
      pin:args.pin,
      entmap:{
        user:userent
      }
    })

    this.wrap(args.pin, function( args, done ){
      args.user = args.user || (args.req$ && args.req$.seneca && args.req$.seneca.user ) || null
      this.parent(args,done)
    })

    done()
  }

  function aliasfields(userData, cb){
    var data = userData.data
    data.nick =
      data.nick ?
        data.nick :
        data.username ?
          data.username :
          data.email
    return cb(null, data)
  }

  function cmd_register( args, done ) {
    var seneca = this
    seneca.act({role: plugin, cmd: 'mapFields', action: 'register', data: args.data}, function(err, details){
      var req = args.req$
      var res = args.res$

      seneca.act(_.extend({role:'user',cmd:'register'}, details), function( err, out ){
        if( err || !out.ok ) {
          return done( err, out );
        }

        seneca.act(_.extend({role:'user',cmd:'login'}, { nick:out.user.nick, auto:true }), function( err, out ){
          if( err || !out.ok ) {
            return done( err, out );
          }

          if( req && req.seneca ) {
            req.seneca.user  = out.user
            req.seneca.login = out.login

            if( res ) {
              seneca.act({role: 'auth', set: 'token', tokenkey: options.tokenkey, token: req.seneca.login.id, req: req, res: res}, function(err){
                return done(null, {
                  ok:    out.ok,
                  user:  out.user,
                  login: out.login
                })
              })
            }
          }
          else{
            done(null, {
              ok:    out.ok,
              user:  out.user,
              login: out.login
            })
          }
        })
      })
    })
  }

  function cmd_create_reset( args, done ) {
    seneca.act({role: plugin, cmd: 'mapFields', action: 'create_reset', data: args.data}, function(err, userData){
      var nick  = userData.nick
      var email = userData.email

      var args = {}
      if( void 0 != nick )  args.nick  = nick;
      if( void 0 != email ) args.email = email;

      seneca.act(_.extend({role:'user',cmd:'create_reset'}, args), done)
    })
  }

  function cmd_load_reset( args, done ) {
    var token = args.data.token

    seneca.act({role:'user',cmd:'load_reset', token:token}, function( err, out ) {
      if( err || !out.ok ) {
        return done(  err, out );
      }

      return done(null, {
        ok: out.ok,
        nick: out.user.nick
      })
    })
  }


  function cmd_execute_reset( args, done ) {
    var token    = args.data.token
    var password = args.data.password
    var repeat   = args.data.repeat

    seneca.act({role:'user',cmd:'execute_reset', token:token, password:password, repeat:repeat}, done)
  }


  function cmd_confirm( args, done ) {
    var code = args.data.code

    seneca.act({role:'user',cmd:'confirm', code:code}, done)
  }

  function cmd_update_user( args, done ) {
    seneca.act({role: plugin, cmd: 'mapFields', action: 'update', data: args.data}, function(err, userData){
      seneca.act(_.extend({role:'user',cmd:'update'}, userData), done)
    })
  }

  function cmd_change_password( args, done ) {
    var user = args.user

    seneca.act({role:'user',cmd:'change_password', user:user, password:args.data.password, repeat:args.data.repeat }, done )
  }

  function cmd_instance( args, done ) {
    var seneca = this

    var user  = args.user
    var login = args.login

    if (!user || !login || !login.active){
      return done( null, {ok: false})
    }

    seneca.act({ role:plugin, cmd:'clean', user:user, login:login}, function( err, out ){
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
    }

    return done(null,{ user:user, login:login })
  }

  var pp_auth = {}

  function configureServices(service, conf){
    conf = conf || {}
    var func = null

    pp_auth[service] = function( req, res, next ){
      if (service != 'local') {
        func = function (err, user, info) {
          seneca.act(_.extend({},{role: 'auth', trigger: 'service-login-' + service, service: service, user: user}),
            function (err, user) {
              if (err) {
                return afterlogin( err, next, req, res );
              }

              seneca.act({role: 'user', cmd: 'login', nick: user.nick, auto: true}, function (err, out) {
                req.user = out
                afterlogin( err, next, req, res )
              })
            }
          )
        }
      }

      passport.authenticate(service, conf, func)(req, res, next)
    }
  }

  function buildservice() {
    var pp_init = passport.initialize()

    function init_session( req, res, cb ) {
      seneca.act({role: 'auth', get: 'token', tokenkey: options.tokenkey, req: req, res: res}, function(err, result){
        var token
        if (result){
          token = result.token
        }

//      var token = req.seneca.cookies.get( options.tokenkey )

        if( token ) {
          seneca.act({role:'user',cmd:'auth', token:token}, function(err, out){
            if( err ) {
              return cb(err);
            }

            if( out.ok ) {
              req.user = {user:out.user,login:out.login}
              req.seneca.user = out.user
              req.seneca.login = out.login

              return cb();
            }
            else {
              // dead login - get rid of the token
              seneca.act({role: 'auth', set: 'token', tokenkey: options.tokenkey, req: req, res: res}, function(){
                return cb();
              })

            }
          })
        }
        else {
          return cb();
        }
      })
    }

    var restriction = (function(){
      if( _.isFunction(options.restrict) ) return options.restrict;

      var checks = urlmatcher(options.restrict)

      return function( req, res, next ) {
        for( var cI = 0; cI < checks.length; cI++ ) {
          var restrict = checks[cI](req)
          if( restrict && !(req.seneca && req.seneca.user) ) {
            seneca.act({role: 'auth', cmd: 'redirect', req: req, res: res, kind: req.url}, function(err, redirect){
              if( redirect ) {
                return next(null, {http$: {status: 302,redirect:options.redirect.restrict}})
              }
              else {
                return next(null, { ok:false, why:'restricted', http$: {status: 401} })
              }
            })
            break;
          }
        }
        if( cI == checks.length ) {
          next();
        }
      }
    })();

    return function(req,res,next){
      if( exclude_url(req) && !include_url(req) ) {
        return next()
      }

      if (!req.seneca){
        return next('Cannot process, seneca-web dependency problem');
      }

      req.seneca.cookies = new Cookies(req,res)

      pp_init( req, res, function(err){
        if( err) {
          return next(err);
        }

        init_session( req, res, function(err){
          if( err) {
            return next(err);
          }

          restriction( req, res, next)
        })
      })
    }
  }


  function init( args, done ) {
    done()
  }

  function authcontext( req, res, args, act, respond ) {
    seneca.act({role: 'auth', cmd: 'redirect', req: req, res: res, kind: args.cmd}, function(err, redirect){
      var user = req.seneca && req.seneca.user
      if( user ) {
        args.user = user
      }

      var login = req.seneca && req.seneca.login
      if( login ) {
        args.login = login
      }

      act(args,function( err, out ){
        if( err ) {
          seneca.log.debug(err)
          out = out || {}
          out.http$ = {
            status: 400,
            redirect: redirect && redirect.fail
          }
          return respond(null, out);
        }

        out.http$ = {
          status: out.ok ? 200 : 400,
          redirect: redirect && redirect.win
        }

        respond(null,out)
      })
    })
  }

  var config = {prefix:options.prefix,redirects:{}}

//  if( options.defaultpages ) {
//    _.each(options.loginpages, function(loginpage){
//      config.redirects[loginpage.path]={redirect:loginpage.redirect,title:loginpage.title}
//    })
//  }

//LOGIN START
  function afterlogin( err, next, req, res ) {
    seneca.act({role: 'auth', cmd: 'redirect', req: req, res: res, kind: 'login'}, function(redirectErr, redirect){
      // req.user actually == {ok:,user:,login:}
      if( err && !err.why ) {
        return next(null, {http$: {status: 301,redirect:redirect.fail}})
      }

      if( req.user && req.user.ok ) {
        // rename passport req.user prop
        req.seneca.user = req.user.user
        req.seneca.login = req.user.login

        seneca.act({role: 'auth', set: 'token', tokenkey: options.tokenkey, token: req.seneca.login.id, req: req, res: res}, function(){
          return do_respond(null, redirect, next)
        })
      }
      else {
        //var out = {ok:false,why:(req.user&&req.user.why)||'no-user'}
        //delete req.user
        var out = { ok:false, why: (err ? err.why : 'Unknown error') }
        if( redirect ) {
          req.seneca.log.debug( 'redirect', 'login', 'fail', redirect.fail )

          return next(null, {http$: {status: 301,redirect:redirect.fail}})
        }
        else {
          return next(null, out)
        }
      }
    })

    function do_respond(err, redirect, cb) {
      if( err) {
        return cb(null, {http$: { status: 302 } })
      }

      if( redirect ) {
        req.seneca.log.debug( 'redirect', 'login', 'win', redirect.win )
        return cb(null, {http$: {status: 301,redirect:redirect.win}})
      }
      else {
        // FIX: this should call instance
        // FIX: how to handle errors here?
        seneca.act({role:plugin, cmd:'clean', user:req.seneca.user, login:req.seneca.login},function(err, out){
          out.ok = true
          return cb(null, out)
        })
      }
    }
  }

  function cmd_login(args, cb) {
    var req = args.req$
    var res = args.res$

    req.query = _.extend( {}, req.query || {}, req.body || {} )

    seneca.act({role: plugin, cmd: 'mapFields', action: 'login', data: args.data}, function(err, userData){
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


      pp_auth.local(req, res, function (loginerr, out) {
        if (loginerr){
          seneca.act({role: 'auth', cmd: 'redirect', req: req, res: res, kind: 'login'}, function(err, redirect){
            if ( redirect ){
              return cb(null, { http$: { status: 301, redirect:redirect.fail }})
            }else{
              return cb(null, { http$: { status: 401 }, ok: false, why: loginerr})
            }
          })
        }
        else{
          afterlogin(err, cb, req, res)
        }
      })
    })
  }
//LOGIN END


//LOGOUT START
  function cmd_logout(args, cb) {
    var req = args.req$
    var res = args.res$

    // get token from request
    seneca.act({role: 'auth', get: 'token', tokenkey: options.tokenkey, req: req, res: res}, function(err, clienttoken){
      clienttoken = clienttoken.token
      // delete token
      seneca.act({role: 'auth', set: 'token', tokenkey: options.tokenkey, req: req, res: res}, function(){
        var servertoken
        if( req.seneca ) {
          servertoken = req.seneca.login && req.seneca.login.token
          delete req.seneca.user
          delete req.seneca.login
        }

        var token = clienttoken || servertoken || ''
        seneca.act({role: 'auth', cmd: 'redirect', req: req, res: res, kind: 'logout'}, function(err, redirect){
          seneca.act({role:'user',cmd:'logout', token: token}, function(err) {
            if( err ) {
              seneca.log('error',err)
              if (redirect){
                return cb(null, {http$: {status: 301,redirect:redirect.fail}})
              }
              else{
                return cb(null, { ok: false, why: err } )
              }
            }

            try {
              req.logout()
            } catch(err) {
              seneca.log('error',err)
              if (redirect){
                return cb(null, {http$: {status: 301,redirect:redirect.fail}})
              }
              else{
                return cb(null, { ok: false, why: err } )
              }
            }

            if (redirect){
              return cb(null, { http$: { status: 301,redirect: redirect.win } } )
            }
            else{
              return cb(null, { ok: true } )
            }
          })
        })
      })
    })
  }

//LOGOUT END


  // seneca web endpoints map
  var map = {
    login:           { POST: true, GET: true, data: true, alias: options.urlpath.login},
    logout:          { POST: true, GET: true, data: true, alias: options.urlpath.logout},
    register:        { POST:authcontext, data:true, alias: options.urlpath.register},
    instance:        { GET: authcontext,            alias: options.urlpath.instance},
    create_reset:    { POST:authcontext, data:true, alias: options.urlpath.create_reset },
    load_reset:      { POST:authcontext, data:true, alias: options.urlpath.load_reset },
    execute_reset:   { POST:authcontext, data:true, alias: options.urlpath.execute_reset },
    confirm:         { POST:authcontext, data:true, alias: options.urlpath.confirm },
    update_user:     { POST:authcontext, data:true, alias: options.urlpath.update_user },
    change_password: { POST:authcontext, data:true, alias: options.urlpath.change_password }
  }

  var _login_service = function (service, args, next) {
    var req = args.req$
    var res = args.res$
    pp_auth[service](req, res, function (err) {
    })
    next()
  }

  var _blank_responder = function( req, res, err, out ){
    // no need to do anything here as all response data is set by passport strategy
  }

  var _service_callback = function (service, args, next) {
    var req = args.req$
    var res = args.res$
    pp_auth[service](req, res, function (err) {
      if (err) {
        return next(err);
      }

      afterlogin(err, next, req, res)
    })
  }

  seneca.act({
    role:'web',
    plugin:plugin,
    config:config,
    use:{
      prefix:options.prefix,
      pin:{role:plugin,cmd:'*'},
      startware:buildservice(),
      map: map
    }
  })

  return {
    name:plugin
  }
}
