/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
"use strict";


var util     = require('util')
var buffer   = require('buffer')


var _            = require('underscore')
var async        = require('async')
var S            = require('string')
var gex          = require('gex')
var Cookies      = require('cookies')
var passport     = require('passport')
var connect      = require('connect')

module.exports = function auth( options ) {
  var seneca = this
  var plugin = 'auth'

  var authPlugins = {
    'facebook': 'seneca-facebook-auth'
  }

  seneca.depends(plugin,['web','user'])


  // using seneca.util.deepextend here, as there are sub properties
  options = seneca.util.deepextend({

    admin:{local:false},

    tokenkey:'seneca-login', // name of cookie
    transientprefix:'seneca-transient-', // cookie prefix

    service:{local:{}},

    prefix: '/auth',

    urlpath: {
      login:    '/login',
      logout:   '/logout',
      instance: 'instance',
      register: 'register',
      reset_create:  'reset_create',
      reset_load:    'reset_load',
      reset_execute: 'reset_execute'
    },

    restrict: '/account',

    // urls patterns to ignore (don't bother looking for user)
    exclude: /(\.ico|\.css|\.png|\.jpg|\.gif)$/,

    // urls patterns to process  (always look for user)
    include: [],

    // auth plugin's own content
    content: ['suffix:/login-web.js'],

    // redirect settings, if redirecting
    redirect:{
      always: false,
      win:'/',
      fail:'/',
      restrict:'/',

      login:         {win:'/account',fail:'/'},
      logout:        {win:'/',fail:'/'},
      register:      {win:'/account',fail:'/'},
      reset_create:  {win:'/',fail:'/'},
      reset_load:    {win:'/',fail:'/'},
      reset_execute: {win:'/',fail:'/'},
      confirm:       {win:'/',fail:'/'}
    },

    // alias:field
    register: {
      fields: {
        name:'name',
        nick:'nick',
        email:'email',
        password:'password',
        repeat:'repeat',

        username:'nick'
        // add your own
      }
    },
    login: {
      fields: {
        username:'nick'
      }
    },

    user: {
      updatefields: ['name','email']
    },

    loginpages:[
      { path:'/login/admin', redirect:'/admin', title:'Administration' },
      { path:'/login', redirect:'/account', title:'Account' }
    ]

  },options)

  var m
  if( (m = options.prefix.match(/^(.*)\/+$/)) ) {
    options.prefix = m[1]
  }

  _.each(options.urlpath,function(v,k){
    options.urlpath[k] = '/'==v[0] ? v : options.prefix+'/'+v
  })


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

  seneca.add({role:plugin,cmd:'update_user'},     cmd_update_user)
  seneca.add({role:plugin,cmd:'change_password'}, cmd_change_password)

  seneca.add({role: plugin, cmd: 'login'},        _login)
  seneca.add({role: plugin, cmd: 'logout'},       _logout)
  seneca.add({role: plugin, cmd: 'register_service' },
    cmd_register_service)

  function aliasfields( which, src ) {
    var out = _.clone( src )
    _.each( options[which].fields, function( field, alias ){
      var input = _.isString(alias) ? alias : field
      var value = src[input]

      if( !_.isUndefined(value) ) {
        out[field] = value
      }
    })
    return out
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
  var useract = seneca.pin({role:'user',cmd:'*'})

  passport.serializeUser(function(user, done) {
    done(null, user.user.id);
  })

  passport.deserializeUser(function(id, done) {
    done(null)
  })


  // default service login trigger
  function trigger_service_login( args, done ) {
    var seneca = this

    var q = {}
    if( args.identifier ) {
      q[ args.service + '_id' ] = args.identifier
    }
    else {
      return seneca.fail({code:'no_identifier'}, done )
    }

    userent.load$(q,function(err,user){
      if( err ) return done(err);

      var props = {
        nick:args.nick,
        email:args.email,
        name:args.name,
        active:true,
        service:{}
      }

      props[args.service+'_id']=args.identifier

      props.service[ args.service ] = {
        credentials: args.credentials,
        userdata: args.userdata,
        when: args.when
      }

      if( !user ) {
        useract.register( props, function(err,out){
          if( err ) return done(err);
          done(null,out.user)
        })
      }
      else {
        user.data$( seneca.util.deepextend( user.data$(), props ) )
        user.save$( done )
      }
    })
  }

  // add own action with service:foo for new services
  function hook_service_init(seneca, args, done) {
    var service = args.service
    if ('local' === args.service){
      var service_init = require('./' + args.service)
      service_init.call(seneca, args.conf, args.passport, done)
    }else{
      var authPluginName = authPlugins[service] || args.conf.pluginName || service

      seneca.log.debug('Loading specified auth definition: ' + authPluginName)
      var authPlugin = require(authPluginName)
      authPlugin.call(seneca, args.conf)
      done()
    }
  }


  function cmd_register_service(args, cb) {
    seneca.log.info('registering auth service [' + args.service + ']')
    passport.use(args.service, args.plugin)
    registerService(args.service, args.conf)
    cb()
  }

  function registerService(service, conf){
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

  function cmd_register( args, done ) {
    var seneca = this
    var details = aliasfields('register',args.data)
    var req = args.req$
    var res = args.res$

    useract.register( details, function( err, out ){
      if( err || !out.ok ) {
        return done( err, out );
      }

      useract.login({ nick:out.user.nick, auto:true }, function( err, out ){
        if( err || !out.ok ) {
          return done( err, out );
        }

        if( req && req.seneca ) {
          req.seneca.user  = out.user
          req.seneca.login = out.login

          if( res ) {
            //res.seneca.cookies.set( options.tokenkey, req.seneca.login.id, options )

            seneca.act({role: 'token', cmd: 'set', tokenkey: options.tokenkey, token: req.seneca.login.id, res: res, req: req}, function(err){
              return done(null, {
                ok:    out.ok,
                user:  out.user,
                login: out.login
              })
            })
          }
        }else{
          done(null, {
            ok:    out.ok,
            user:  out.user,
            login: out.login
          })
        }
      })
    })
  }


  function cmd_create_reset( args, done ) {
    var nick  = args.data.nick || args.data.username
    var email = args.data.email

    var args = {}
    if( void 0 != nick )  args.nick  = nick;
    if( void 0 != email ) args.email = email;

    useract.create_reset( args, function( err, out ) {
      if( err || !out.ok ) {
        return done(err,out);
      }

      done(null,{
        ok: out.ok
      })
    })
  }

  function cmd_load_reset( args, done ) {
    var token = args.data.token

    useract.load_reset( {token:token}, function( err, out ) {
      if( err || !out.ok ) {
        return done(err,out);
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

    useract.execute_reset( {token:token, password:password, repeat:repeat}, function( err, out ) {
      if( err || !out.ok ) {
        return done(err,out);
      }

      return done(null, {
        ok: out.ok
      })
    })
  }


  function cmd_confirm( args, done ) {
    var code = args.data.code

    useract.confirm( {code:code}, function( err, out ) {
      if( err || !out.ok ) {
        return done(err,out);
      }

      return done(null, {
        ok: out.ok
      })
    })
  }

  function cmd_update_user( args, done ) {
    var data = args.data

    useract.update(data, function(err, user){
      return done( err, { ok:true, user:user } )
    })
  }

  function cmd_change_password( args, done ) {
    var user = args.user

    useract.change_password({ user:user, password:args.data.password, repeat:args.data.repeat },function(err, out){
      return done(err, out);
    })
  }

  function cmd_instance( args, done ) {
    var seneca = this

    var user  = args.user
    var login = args.login

    seneca.act({ role:plugin, cmd:'clean', user:user, login:login}, function(err,out){
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

  seneca.util.recurse(
    _.keys(options.service),
    function(service,next){

      var conf = _.extend({
        urlhost:'http://127.0.0.1:3333'
      }, options.service[service] )

      hook_service_init(seneca, { service:service, conf:conf, passport:passport }, function(err){
        return next(err)
      })
    },
    function(){}
  )


  function redirection( req, res, kind, cb ) {
    seneca.act({role: 'token', cmd: 'get', tokenkey: options.transientprefix + 'url-prefix', res: res, req: req}, function(err, result){
      var transientprefix
      if (result){
        transientprefix = result.token
      }

      //req.seneca.cookies.get(options.transientprefix+'url-prefix')
      seneca.act({role: 'token', cmd: 'set', tokenkey: options.transientprefix + 'url-prefix', res: res, req: req}, function(){
        //req.seneca.cookies.set( options.transientprefix + 'url-prefix' )

        transientprefix = req.query && void 0 != req.query.prefix ? req.query.prefix : transientprefix

        transientprefix = void 0 == transientprefix ? '' : ''+transientprefix

        var redirect = false
        var ct = (req.headers['content-type']||'').split(';')[0]

        if( options.redirect.always ) {
          redirect = true
        }
        else if( !_.isUndefined(req.query.redirect) ) {
          redirect = S(req.query.redirect).toBoolean()
        }
        else if( 'application/x-www-form-urlencoded'==ct || 'multipart/form-data'==ct ) {
          redirect = true
        }
        else if( 'application/json'==ct ) {
          redirect = false
        }
        else redirect = true;

        if( redirect ) {
          var rk = options.redirect[kind]

          redirect = {
            win:  _.isString(req.query.win) ? req.query.win : transientprefix + ( (rk && rk.win)  || options.redirect.win ),
            fail: _.isString(req.query.fail) ? req.query.fail : transientprefix + ( (rk && rk.fail) || options.redirect.fail )
          }
        }

        cb(null, redirect)
      })
    })
  }

  var pp_auth = {}

  function configureServices(){
    _.each( options.service, function( conf, service ){

      var conf = _.extend( {}, options.service[service].authconf || {} )
      var func = null

      pp_auth[service] = function( req, res, next ){
        var prefix  = req.query && req.query.prefix
        var context = req.query && req.query.context

        if( void 0 != prefix && '' != prefix ) {
          seneca.act({role: 'token', cmd: 'set', tokenkey: options.transientprefix + 'url-prefix', token: prefix, res: res, req: req}, function(){})
//        res.seneca.cookies.set( options.transientprefix + 'url-prefix', prefix, options )
        }

        if( void 0 != context && '' != context ) {
          seneca.act({role: 'token', cmd: 'set', tokenkey: options.transientprefix + 'context', token: context, res: res, req: req}, function(){})
//          res.seneca.cookies.set( options.transientprefix + 'context', context, options )
        }

        if (service != 'local') {
          func = function (err, user, info) {
            seneca.act(_.extend({},user,{role: 'auth', trigger: 'service-login-' + service, service: service}),
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
    })
  }

  function buildservice() {
    var pp_init = passport.initialize()

    configureServices()

    function init_session( req, res, cb ) {
      seneca.act({role: 'token', cmd: 'get', tokenkey: options.tokenkey, res: res, req: req}, function(err, result){
        var token
        if (result){
          token = result.token
        }

//      var token = req.seneca.cookies.get( options.tokenkey )

        if( token ) {
          useract.auth( {token:token}, function(err, out){
            if( err ) {
              return cb(err);
            }

            if( out.ok ) {
              req.user = {user:out.user,login:out.login}
              req.seneca.user = out.user
              req.seneca.login = out.login

              return cb()
            } else {
              // dead login - get rid of the cookie
              seneca.act({role: 'token', cmd: 'set', tokenkey: options.tokenkey, res: res, req: req}, function(){
//              res.seneca.cookies.set( options.tokenkey )
                return cb();
              })

            }
          })
        } else {
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


            var redirect = false
            var ct = (req.headers['content-type']||'').split(';')[0]

            if( 'application/json'==ct ) {
              redirect = false
            }
            else redirect = true;


            if( redirect ) {
              return next(null, {http$: {status: 302,redirect:options.redirect.restrict}})
            }
            else {
              return next(null, { ok:false, why:'restricted', http$: {status: 401} })
            }
            break;
          }
        }
        if( cI == checks.length ) next();
      }
    })();

    return function(req,res,next){
      if( exclude_url(req) && !include_url(req) ) {
        return next()
      }

      // TODO: assumes req.seneca exists, so has dependency on seneca-web
      req.seneca.cookies = new Cookies(req,res)

      pp_init( req, res, function(err){
        if( err) {
          return next(err);
        }

        init_session( req, res, function(err){
          if( err) {
            return next(err);
          }

          restriction( req, res, function(err){
            if( err) {
              return next(err);
            }
          })
          next()
        })
      })
    }
  }



  function init( args, done ) {
    done()
  }



  function authcontext( req, res, args, act, respond ) {
    redirection( req, res, args.cmd, function(err, redirect){
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
          err.seneca = err.seneca || {}
          err.seneca.httpredirect = redirect && redirect.fail
          return respond(err);
        }

        out.httpstatus$ = out.ok ? 200 : 400
        out.httpredirect$ = redirect && redirect.win
        respond(null,out)
      })
    })
  }


  var config = {prefix:options.prefix,redirects:{}}

  if( options.defaultpages ) {
    _.each(options.loginpages, function(loginpage){
      config.redirects[loginpage.path]={redirect:loginpage.redirect,title:loginpage.title}
    })
  }

//LOGIN START
  function afterlogin( err, next, req, res ) {
    if( err && !err.why ) {
      return next(null, {http$: {status: 302,redirect:redirect.fail}})
    }

    seneca.act({role: 'token', cmd: 'get', tokenkey: options.transientprefix + 'context', res: res, req: req}, function(err, context){
      if (context){
        context = context.token
      }
      //    var context = req.seneca.cookies.get( options.transientprefix + 'context' )
      seneca.act({role: 'token', cmd: 'set', tokenkey: options.transientprefix + 'context', res: res, req: req}, function(){
        //    res.seneca.cookies.set( options.transientprefix + 'context' )

        redirection( req, res, 'login', function(err, redirect){
          // req.user actually == {ok:,user:,login:}
          if( req.user && req.user.ok ) {
            // rename passport req.user prop
            req.seneca.user = req.user.user
            req.seneca.login = req.user.login

            seneca.act({role: 'token', cmd: 'set', tokenkey: options.tokenkey, token: req.seneca.login.id, res: res, req: req}, function(){
//            res.seneca.cookies.set( options.tokenkey, req.seneca.login.id, options )

              if( '' != context ) {
                req.seneca.login.context = context
                req.seneca.login.save$(function(err){
                  return do_respond(err, redirect, next)
                })
              }
              else {
                return do_respond(null, redirect, next)
              }
            })
          }
          else {
            //var out = {ok:false,why:(req.user&&req.user.why)||'no-user'}
            //delete req.user
            var out = { ok:false, why:err.why }
            if( redirect ) {
              req.seneca.log.debug( 'redirect', 'login', 'fail', redirect.fail )

              return next(null, {http$: {status: 302,redirect:redirect.fail}})
            }
            else {
              return next(null, out)
            }
          }
        })
      })
    })

    function do_respond(err, redirect, cb) {
      if( err) {
        return cb(null, {http$: { status: 302 } })
      }

      if( redirect ) {
        req.seneca.log.debug( 'redirect', 'login', 'win', redirect.win )
        return cb(null, {http$: {status: 302,redirect:redirect.win}})
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

  function _login(args, cb) {
    var req = args.req$
    var res = args.res$

    req.query = _.extend( {}, req.query || {}, req.body || {} )

    if (null == req.query.username) {
      req.query.username = null != req.query.nick ? req.query.nick : req.query.email
    }

    pp_auth.local(req, res, function (err) {
      afterlogin(err, cb, req, res)
    })
  }
//LOGIN END


//LOGOUT START
  function _logout(args, cb) {
    var req = args.req$
    var res = args.res$

    var clienttoken = req.seneca.cookies.get(options.tokenkey)
    var servertoken
    seneca.act({role: 'token', cmd: 'set', tokenkey: options.tokenkey, res: res, req: req}, function(){
      //    res.seneca.cookies.set(options.tokenkey)

      if( req.seneca ) {
        servertoken = req.seneca.login && req.seneca.login.token
        delete req.seneca.user
        delete req.seneca.login
      }

      if( clienttoken ) {
        useract.logout({token:clienttoken},function(err){
          if( err ) {
            seneca.log('error',err)
            return cb(null, {http$: {status: 301,redirect:redirect.fail}})
          }
        })
      }

      if( servertoken && servertoken != clienttoken ) {
        seneca.log( 'auth', 'token-mismatch', clienttoken, servertoken )
        useract.logout( {token:servertoken},function(err) {
          if( err ) {
            seneca.log('error',err)
            return cb(null, {http$: {status: 301,redirect:redirect.fail}})
          }
        })
      }

      try {
        req.logout()
      } catch(err) {
        if( err ) {
          seneca.log('error',err)
          return cb(null, {http$: {status: 301,redirect:redirect.fail}})
        }
      }

      var redirect = redirection(req,res,'logout', function(err, redirect){
        cb(null, {http$: {status: 301,redirect:redirect.win}})
      })
    })
  }

//LOGOUT END


  var map = {
    login:           { POST: true, GET: true, data: true, alias: options.urlpath.login },
    logout:          { POST: true, GET: true, data: true, alias: options.urlpath.logout },
    register:        { POST:authcontext, data:true },
    instance:        { GET:authcontext },
    create_reset:    { POST:authcontext, data:true },
    load_reset:      { POST:authcontext, data:true },
    execute_reset:   { POST:authcontext, data:true },
    confirm:         { POST:authcontext, data:true },
    update_user:     { POST:authcontext, data:true },
    change_password: { POST:authcontext, data:true }
  }

  var _login_service = function (service, args, next) {
    var req = args.req$
    var res = args.res$
    pp_auth[service](req, res, function (err) {
      if (err) return next(err);
    })
  }

  var _service_callback = function (service, args, next) {
    var req = args.req$
    var res = args.res$
    pp_auth[service](req, res, function (err) {
      if (err) return next(err);

      afterlogin(err, next, req, res)
    })
  }

  // register all services as seneca actions
  _.each(options.service, function (conf, service) {
    seneca.add({role: plugin, cmd: 'auth-' + service}, _login_service.bind(this, service))
    seneca.add({role: plugin, cmd: 'auth-' + service + '-callback'}, _service_callback.bind(this, service))

    map['auth-' + service] = {GET: true, POST: true, alias: '/' + service}
    map['auth-' + service + '-callback'] = {GET: true, POST: true, alias: '/' + service + '/callback'}

    seneca.add({ role:plugin, trigger:'service-login-' + service }, trigger_service_login)

  })

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
