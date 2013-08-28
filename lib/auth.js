/* Copyright (c) 2012-2013 Richard Rodger, MIT License */
"use strict";


var util     = require('util')


var _        = require('underscore')
var S        = require('string')
var gex      = require('gex')
var dispatch = require('dispatch')

var passport = require('passport')

  

module.exports = function auth( options ) {
  var seneca = this
  var name = 'auth'


  seneca.depends(name,['user'])

  
  // using seneca.util.deepextend here, as there are sub properties
  options = seneca.util.deepextend({
    
    admin:{local:false},

    tokenkey:'seneca-login', // name of cookie
    transientprefix:'seneca-transient-', // cookie prefix

    service:{local:{}},

    prefix: '/auth',

    urlpath: {
      login:    'login',
      logout:   'logout',
      instance: 'instance',
      register: 'register',
      reset_create:  'reset_create',
      reset_load:    'reset_load',
      reset_execute: 'reset_execute',
    },

    restrict: '/account',

    // urls patterns to ignore (don't bother looking for user)
    exclude: /(\.ico|\.css|\.png|\.jpg|\.gif)$/,

    // urls patterns to process  (always look for user)
    include: [],

    sendemail:false,
    email:{
      send:false,
      code:{
        register:'auth-register',
        create_reset:'auth-create-reset'
      },
      subject:{
        register:'Welcome!',
        create_reset:'Password Reset'
      },
      content:{
        resetlinkprefix:'http://127.0.0.1:3333/reset/',
        confirmlinkprefix:'http://127.0.0.1:3333/confirm/'
      }
    },

    // redirect settings, if redirecting
    redirect:{
      always: false,
      win:'/',
      fail:'/',
      
      login:         {win:'/',fail:'/',},
      logout:        {win:'/',fail:'/',},
      register:      {win:'/',fail:'/',},
      reset_create:  {win:'/',fail:'/',},
      reset_load:    {win:'/',fail:'/',},
      reset_execute: {win:'/',fail:'/',},
      confirm:       {win:'/',fail:'/',},
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
    }

  },options)


  if( !options.prefix.match(/\/+$/) ) {
    options.prefix += '/'
  }


  _.each(options.urlpath,function(v,k){
    options.urlpath[k] = '/'==v[0] ? v : options.prefix+v
  })



  seneca.add({ role:name, cmd:'login' }, cmd_login)
  seneca.add({ role:name, trigger:'service-login' }, trigger_service_login)
  seneca.add({ role:name, wrap:'user' }, wrap_user)
  seneca.add({ role:name, hook:'service-init' }, hook_service_init)
  seneca.add({init:name}, init)


  seneca.add({role:name,cmd:'register'},      cmd_register)
  seneca.add({role:name,cmd:'create_reset'},  cmd_create_reset)
  seneca.add({role:name,cmd:'load_reset'},    cmd_load_reset)
  seneca.add({role:name,cmd:'execute_reset'}, cmd_execute_reset)
  seneca.add({role:name,cmd:'confirm'},       cmd_confirm)


  function aliasfields(which,src) {
    var out = _.clone(src)
    _.each(options[which].fields,function(field,alias){
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

  function checkurl(match) {
    var checks = urlmatcher(match)
    return function(req) {
      for( var i = 0; i < checks.length; i++ ) {
        if( checks[i](req) ) return true
      }
      return false
    }
  }

  var exclude_url = checkurl(options.exclude)
  var include_url = checkurl(options.include)



  var userent = seneca.make$('sys/user')
  var useract = seneca.pin({role:'user',cmd:'*'})

  if( options.sendemail ) {
    seneca.depends(name,['mail'])
    var mailact = seneca.pin({role:'mail',cmd:'*'})
  }


  passport.serializeUser(function(user, done) {
    done(null, user.user.id);
  })

  passport.deserializeUser(function(id, done) {
    done(null)
  })





  function cmd_login( args, done ) {
    var nick = args.nick || ( args.user && args.user.nick )

    if( nick && args.auto ) {
      seneca.act('role:user,cmd:login,auto:true,nick:'+nick,function(err,out){
        if( err ) return done(err);
        do_web(out.user,out.login)
      })
    }
    else do_web( args.user, args.login )

    function do_web( user, login ) {
      if( args.req$ && args.req$.seneca ) {
        args.req$.seneca.user = user
        args.req$.seneca.login = login
        args.res$.cookie(options.tokenkey,login.token)
        done(null,{ok:true,user:user,login:login})
      }
      else return done(null,{ok:false});
    }
  }





  // default service login trigger
  function trigger_service_login( args, done ) {
    var q = {}
    if( args.identifier ) {
      q[args.service+'_id']=args.identifier
    }
    else return service.fail({code:'no_identifier'},done)

    userent.load$(q,seneca.err(done,function(user){
      var props = {
        nick:args.nick,
        email:args.email,
        name:args.name,
        active:true,
        service:{}
      }
      props[args.service+'_id']=args.identifier

      props.service[args.service]={
        credentials:args.credentials,
        userdata:args.userdata,
        when:args.when
      }
      

      if( !user ) {
        useract.register( props, seneca.err(done,function(out){
          done(null,out.user)
        }))
      }
      else {
        user.data$( seneca.util.deepextend( user.data$(), props ) )
        user.save$( done )
      }
    }))
  }

  
  // add own action with service:foo for new services
  function hook_service_init( args, done ) {
    var service_init = require('./'+args.service)
    service_init.call(this,args.conf,args.passport,done)
  }




  function wrap_user( args, done ) {
    this.act({
      role:'util',
      cmd:'ensure_entity',
      pin:args.pin,
      entmap:{
        user:userent,
      }
    })

    this.wrap(args.pin,function(args,done){
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

    useract.register(details,function(err,out){
      if( err || !out.ok ) { return done(err,out); }

      useract.login({nick:out.user.nick,auto:true},function(err,out){
        if( err || !out.ok ) { return done(err,out); }

        if( options.sendemail ) {
          mailact.send( {code:options.email.code.register, 
                         to:out.user.email, 
                         subject:options.email.subject.register,
                         content:{name:out.user.name,
                                  confirmcode:out.user.confirmcode,
                                  confirmlink:options.email.content.confirmlinkprefix+out.user.confirmcode}} )
        }

        req.seneca.user  = out.user
        req.seneca.login = out.login
        res.cookie(options.tokenkey,req.seneca.login.token)

        done(null,{
          ok:    out.ok,
          user:  out.user,
          login: out.login
        })
      })
    })
  }





  function cmd_create_reset( args, done ) {
    var seneca = this

    var nick  = args.data.nick || args.data.username
    var email = args.data.email

    var args = {}
    if( void 0 != nick )  args.nick  = nick;
    if( void 0 != email ) args.email = email;

    useract.create_reset( args, function( err, out ) {
      if( err || !out.ok ) return done(err,out);

      if( options.sendemail ) {
        mailact.send( {code:options.email.code.create_reset, 
                       to:out.user.email, 
                       subject:options.email.subject.create_reset,
                       content:{name:out.user.name,
                                resetlink:options.email.content.resetlinkprefix+out.reset.id}} )
      }
        
      done(null,{
        ok: out.ok,
      })
    })
  }



  function cmd_load_reset( args, done ) {
    var seneca = this

    var token = args.data.token

    useract.load_reset( {token:token}, function( err, out ) {
      if( err || !out.ok ) return done(err,out);
        
      done(null,{
        ok: out.ok,
        nick: out.user.nick
      })
    })
  }


  function cmd_execute_reset( args, done ) {
    var seneca = this

    var token    = args.data.token
    var password = args.data.password
    var repeat   = args.data.repeat

    useract.execute_reset( {token:token,password:password,repeat:repeat}, function( err, out ) {
      if( err || !out.ok ) return done(err,out);
        
      done(null,{
        ok: out.ok,
      })
    })
  }


  function cmd_confirm( args, done ) {
    var seneca = this

    var code = args.data.code
    var req = args.req$
    
    useract.confirm( {code:code}, function( err, out ) {
      if( err || !out.ok ) return done(err,out);

      return done(null,{
        ok: out.ok,
      })
    })
  }






  seneca.util.recurse( 
    _.keys(options.service), 
    function(service,next){
    
      var conf = _.extend({
        urlhost:'http://127.0.0.1:3333'
      },options.service[service])
      
      seneca.act({role:name,hook:'service-init',service:service,conf:conf,passport:passport},function(err){
        next(err)
      })
    },
    function(err){
      if(err) return cb(err);
    }
  )



  function adminlocal(req,user) {
    if( options.admin.local 
        && ( '127.0.0.1' === req.connection.remoteAddress ||
             '::1' === req.connection.remoteAddress ) )
    {
      user.admin = true
    }
  }



  function redirection(req,res,kind) {
    var prefix = req.cookies[options.transientprefix+'url-prefix']
    res.clearCookie(options.transientprefix+'url-prefix')
    
    prefix = req.query && void 0 != req.query.prefix ? req.query.prefix : prefix

    prefix = void 0 == prefix ? '' : ''+prefix


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
        win:  _.isString(req.query.win) ? req.query.win : prefix + ( (rk && rk.win)  || options.redirect.win ), 
        fail: _.isString(req.query.fail) ? req.query.fail : prefix + ( (rk && rk.fail) || options.redirect.fail ),  
      }
    }

    return redirect
  }


  function respond(err,res,redirect,data){
    if( redirect ) {
      res.redirect( redirect )
    }
    else {
      res.send( 
        _.isNumber(err) ? err 
          : _.isObject(err) ? 500 
          : void 0 != data.ok ?
          !data.ok ? 400 :
          200 : 200, data) 
    }
  }



  function buildservice() {
    var pp_init = passport.initialize()

    var pp_auth = {}
    _.each( options.service, function(conf,service){

      var conf = _.extend({},options.service[service].authconf||{})
      var func = null


      pp_auth[service] = function(req,res,next){
        var prefix = req.query && req.query.prefix
        var context = req.query && req.query.context

        if( void 0 != prefix && '' != prefix ) {
          res.cookie(options.transientprefix+'url-prefix',prefix)
        }

        if( void 0 != context && '' != context ) {
          res.cookie(options.transientprefix+'context',context)
        }

        if (service != 'local') {
          if (!options.service[service].action || options.service[service].action == 'login') {
            func = function (err, user, info) {
              seneca.act(_.extend({},user,{role: 'auth', trigger: 'service-login', service: service}),
                function (err, user) {
                  if (err) return afterlogin(err,next,req,res);

                  seneca.act({role: 'user', cmd: 'login', nick: user.nick, auto: true}, function (err,out) {
                    req.user = out
                    afterlogin(err,next,req,res)
                  })
                }
              )
            }
          }
          else {
            func = function (err, data, info) {
              seneca.act({role: 'auth', trigger: 'service-' + options.service[service].action, service: service,
                  context: req.cookies[options.transientprefix + 'context'],
                  data: data
                },

                         // FIX: should call afterlogin and use options for redirect

                function (err, redirect) {
                  if (err) return next(err)
                  res.redirect(redirect)
                }
              )
            }
          }
        }

        passport.authenticate(service, conf, func)(req, res, next)
      }
    })



    function init_session(req,res,cb) {
      var token = req.cookies[options.tokenkey]
      if( token ) {
        useract.auth({token:token},seneca.err(cb,function(out){        

          if( out.ok ) {
            req.user = {user:out.user,login:out.login}
            req.seneca.user = out.user
            req.seneca.login = out.login

            adminlocal(req,req.seneca.user)

            cb()
          }

          // dead login - get rid of the cookie
          else {
            res.clearCookie( options.tokenkey )
            cb();
          }
        }))
      }
      else cb();
    }



    var restriction = (function(){
      if( _.isFunction(options.restrict) ) return options.restrict;

      var checks = urlmatcher(options.restrict)

      return function(req,res,next) {
        for( var cI = 0; cI < checks.length; cI++ ) {
          var restrict = checks[cI](req)
          if( restrict && !(req.seneca && req.seneca.user) ) {
            
            // TODO: need more control here
            res.writeHead(401)
            res.end('Please login.')
            break;
          }
          }
        if( cI == checks.length ) next();
      }
    })();





    function logerr(err) {
      if( err ) return seneca.log('error',err);
    }



    function afterlogin(err,next,req,res) {
      if( err && !err.why ) return next(err);

      var context = req.cookies[options.transientprefix+'context']
      res.clearCookie(options.transientprefix+'context')

      var redirect = redirection(req,res,'login')

      // req.user actually == {ok:user:,login:}
      if( req.user && req.user.ok ) {
        // rename passport req.user prop
        req.seneca.user = req.user.user
        req.seneca.login = req.user.login

        adminlocal(req,req.seneca.user)

        res.cookie(options.tokenkey,req.seneca.login.token)

        if( '' != context ) {
          req.seneca.login.context = context
          req.seneca.login.save$(do_respond)
        }
        else do_respond()
      }
      else {
        //var out = {ok:false,why:(req.user&&req.user.why)||'no-user'}
        //delete req.user
        var out = {ok:false,why:err.why}
        if( redirect ) {
          req.seneca.log.debug('redirect','login','fail',redirect.fail)

          res.redirect( redirect.fail )
        }
        else {
          res.send(400,out)
        }
      }


      function do_respond(err) {
        if( err) return next(err);

        if( redirect ) {
          req.seneca.log.debug('redirect','login','win',redirect.win)
          res.redirect( redirect.win )
        }
        else {
          // FIX: how to handle errors here?
          useract.clean({user:req.seneca.user},function(err,user){
            res.send({
              ok:    true,
              user:  user,
              login: req.seneca.login.data$()
            })
          })
        }
      }
    }





    var route_login = {
      GET: function(req,res,next) {
        pp_auth.local(req,res,function(err){
          afterlogin(err,next,req,res)
        })
      },
      POST: function(req,res,next) {
        req.query = _.extend({},req.query||{},req.body||{})
        
        // TODO: make general
        if( null == req.query.username ) {
          req.query.username = null != req.query.nick ? req.query.nick : req.query.email 
        }

        pp_auth.local(req,res,function(err){
          afterlogin(err,next,req,res)
        })
      },
    }


    function route_logout(req,res,next) {
      var clienttoken = req.cookies[options.tokenkey]
      var servertoken
      res.clearCookie(options.tokenkey)

      if( req.seneca ) {
        servertoken = req.seneca.login && req.seneca.login.token
        delete req.seneca.user
        delete req.seneca.login
      }

      if( clienttoken ) {
        useract.logout({token:clienttoken},logerr)
      }

      if( servertoken && servertoken != clienttoken ) {
        seneca.log('auth','token-mismatch',clienttoken,servertoken)
        useract.logout({token:servertoken},logerr)
      }

      try { req.logout() } catch(err) { logerr(err) }
      
      var redirect = redirection(req,res,'logout')

      respond(null,res,redirect.win,{ok:true})
    }


    function route_instance(req,res,next) {
      if( req.seneca && req.seneca.user ) {
        useract.clean({user:req.seneca.user},function(err,user){
          res.send({
            user:  user,
            login: req.seneca.login,
          })
        })
      }
      else res.send({})
    }






    var routes = {}
    routes[options.urlpath.login]    = route_login
    routes[options.urlpath.logout]   = route_logout
    routes[options.urlpath.instance] = route_instance
    //routes[options.urlpath.register] = route_register
    //routes[options.urlpath.reset_create]  = route_reset_create
    //routes[options.urlpath.reset_load]    = route_reset_load
    //routes[options.urlpath.reset_execute] = route_reset_execute

    



    _.each(options.service, function (conf, service) {

      routes['/auth/' + service] = function (req, res, next) {
        pp_auth[service](req, res, function (err) {
          if (err) return next(err);
        })
      }

      routes['/auth/' + service + '/callback'] = function (req, res, next) {
        pp_auth[service](req, res, function (err) {
          if (err) return next(err);

          afterlogin(err, next, req, res)
        })
      }
    })


    var dispatcher = dispatch(routes)

    return function(req,res,next){
      if( exclude_url(req) && !include_url(req) ) {
        return next()
      }

      pp_init(req,res,function(err){
        if( err) return next(err);

        init_session(req,res,function(err){
          if( err) return next(err);

          restriction(req,res,function(err){
            if( err) return next(err);

            dispatcher(req,res,next)
          })

        })
      })
    }
  }



  function init( args, done ) {
    done()
  }
  


  function authcontext( req, res, args, act, respond ) {
    var redirect = redirection(req,res,args.cmd)
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
  }


  seneca.act({role:'web',use:{
    prefix:options.prefix,
    pin:{role:name,cmd:'*'},
    startware:buildservice(),
    map:{
      register:      { POST:authcontext, data:true },
      create_reset:  { POST:authcontext, data:true },
      load_reset:    { POST:authcontext, data:true },
      execute_reset: { POST:authcontext, data:true },
      confirm:       { POST:authcontext, data:true },
    }
  }})


  return {
    name:name
  }
}
