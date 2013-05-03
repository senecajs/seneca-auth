/* Copyright (c) 2012-2013 Richard Rodger, MIT License */
"use strict";


var util     = require('util')


var _        = require('underscore')
var S        = require('string')
var gex      = require('gex')
var dispatch = require('dispatch')

var passport = require('passport')

  


module.exports = function auth(opts,cb){
  var seneca = this
  var name = 'auth'


  // TODO: remove
  var si = seneca

  
  // using seneca.util.deepextend here, as there are sub properties
  opts = si.util.deepextend({

    tokenkey:'seneca-login', // name of cookie

    service:{local:{}},

    urlpath: {
      login:    '/auth/login',
      logout:   '/auth/logout',
      instance: '/auth/instance',
      register: '/auth/register'
    },

    restrict: '/account',

    // redirect settings, if redirecting
    redirect:{
      always: false,
      win:'/',
      fail:'/',
      
      login:    {win:'/',fail:'/',},
      logout:   {win:'/',fail:'/',},
      register: {win:'/',fail:'/',},
    },
    
    // alias:field
    register: {
      fields: {
        name:'name',
        nick:'nick',
        email:'email',
        password:'password',
        repeat:'repeat',
        // add your own
      }
    }

  },opts)




  si.add({role:name,cmd:'ping'},function(args,cb){
    cb(null,{rand:args.rand,when:new Date().getTime()})
  })


  var userent
  var useract = si.pin({role:'user',cmd:'*'})

  useract.entity({kind:'user'},si.err(cb,function(user){
    userent = user
  }))


  // TODO: needs to be cleaner...
  si.add({role:name,cmd:'login'},function(args,cb){
    if( args.req$ && args.req$.seneca ) {
      args.req$.seneca.user = args.user
      args.req$.seneca.login = args.login
      args.res$.cookie(opts.tokenkey,args.login.token)
      cb(null,{ok:true})
    }
    else return cb(null,{ok:false});
  })



  passport.serializeUser(function(user, done) {
    done(null, user.user.id);
  })

  passport.deserializeUser(function(id, done) {
    done(null)
  })


  // default service login trigger
  seneca.add({role:name, trigger:'service-login'}, function (args, done) {
    if (seneca.req.user.login) {
      userent.load$({nick:seneca.req.user.login.nick}, seneca.err(done, function (user) {
        var props = {
          email:args.email,
          name:args.name,
          service:{}
        }
        props[args.service + '_id'] = args.identifier;
        props.service[args.service] = {
          credentials:args.credentials,
          userdata:args.userdata,
          when:args.when
        }

        user.data$(seneca.util.deepextend(user.data$(), props))
        user.save$(done)
      }))
    }
    else {
      var q = {}
      if (args.identifier) {
        q[args.service + '_id'] = args.identifier
      }

      userent.load$(q, seneca.err(done, function (user) {
        var props = {
          nick:args.nick,
          email:args.email,
          name:args.name,
          active:true,
          service:{}
        }
        props[args.service + '_id'] = args.identifier

        props.service[args.service] = {
          credentials:args.credentials,
          userdata:args.userdata,
          when:args.when
        }


        if (!user) {
          useract.register(props, seneca.err(done, function (out) {
            done(null, out.user)
          }))
        }
        else {
          user.data$(seneca.util.deepextend(user.data$(), props))
          user.save$(done)
        }
      }))
    }
  })

  // add own action with service:foo for new services
  seneca.add({role:name,hook:'service-init'},function(args,done){
    var service_init = require('./'+args.service)
    service_init.call(this,args.conf,args.passport,done)
  })


  seneca.util.recurse( 
    _.keys(opts.service), 
    function(service,next){
    
      var conf = _.extend({
        urlhost:'http://local.host:3333'
      },opts.service[service])
      
      seneca.act({role:name,hook:'service-init',service:service,conf:conf,passport:passport},function(err){
        next(err)
      })
    },
    function(err){
      if(err) return cb(err);
    }
  )




  function buildservice() {
    var pp_init    = passport.initialize()

    var pp_auth = {}
    _.each( opts.service, function(conf,service){

      var conf = _.extend({},opts.service[service].authconf||{})
      var func = null


      pp_auth[service] = function(req,res,next){
        var prefix = req.query.prefix

        if( prefix ) {
          res.cookie('oauth-url-prefix',prefix)
        }

        seneca.req = req;
        passport.authenticate( service, conf, func)(req,res,next)
      }
    })




    function init_session(req,res,cb) {
      var token = req.cookies[opts.tokenkey]
      if( token ) {
        useract.auth({token:token},si.err(cb,function(out){        

          if( out.ok ) {
            req.user = {user:out.user,login:out.login}
            req.seneca.user = out.user
            req.seneca.login = out.login
            cb()
          }
          else cb();
        }))
      }
      else cb();
    }


    var restriction = (function(){
      var restrict = opts.restrict
      if( _.isFunction(opts.restrict) ) return restrict;

      restrict = _.isArray(restrict) ? restrict : [''+restrict]
      var checks = []
      _.each(restrict,function(path){
        path = ~path.indexOf(':') ? path : 'prefix:'+path
        var parts = path.split(':')
        var kind  = parts[0]
        var spec  = parts.slice(1)

        function regex() { 
          var pat = spec, mod = ''
          var m = /^\/(.*)\/([^\/]*)$/.exec(spec)
          if(m) {
            pat = m[1]
            mod = m[2]
          }
          var re = new RegExp(pat,mod) 
          return function(req) {
            return re.test(req.url)
          }
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



    function redirection(req,res,kind) {
      var prefix = req.cookies['oauth-url-prefix']
      res.clearCookie('oauth-url-prefix')

      var redirect = false
      var ct = (req.headers['content-type']||'').split(';')[0]

      if( opts.redirect.always ) {
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
        var rk = opts.redirect[kind]
        redirect = {
          win:  (rk && rk.win)  || opts.redirect.win,  
          fail: (rk && rk.fail) || opts.redirect.fail,  
        }
      }

      if( prefix ) {
        redirect = prefix+redirect
      }

      return redirect
    }


    function logerr(err) {
      if( err ) return si.log('error',err);
    }



    function afterlogin(err,next,req,res) {
      if( err) return next(err);

      var redirect = redirection(req,res,'login')

      if( req.user && req.user.ok ) {
        // rename passport req.user prop
        req.seneca.user = req.user.user
        req.seneca.login = req.user.login
        res.cookie(opts.tokenkey,req.seneca.login.token)

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
              login: req.seneca.login
            })
          })
        }
      }
      else {
        var out = {ok:false,why:(req.user&&req.user.why)||'no-user'}
        delete req.user
        if( redirect ) {
          req.seneca.log.debug('redirect','login','fail',redirect.fail)
          res.redirect( redirect.fail )
        }
        else {
          res.send(out)
        }
      }
    }


    function respond(res,redirect,data){
      if( redirect ) {
        res.redirect( redirect )
      }
      else {
        res.send(data) 
      }
    }


    var routes = {}

    routes[opts.urlpath.login] = {
      POST: function(req,res,next) {
        req.query = _.extend({},req.query||{},req.body||{})
        pp_auth.local(req,res,function(err){
          afterlogin(err,next,req,res)
        })
      },
    }


    routes[opts.urlpath.logout] = function(req,res,next) {
      var clienttoken = req.cookies[opts.tokenkey]
      var servertoken
      res.clearCookie[opts.tokenkey]

      if( req.seneca ) {
        servertoken = req.seneca.login && req.seneca.login.token
        delete req.seneca.user
        delete req.seneca.login
      }

      if( clienttoken ) {
        useract.logout({token:clienttoken},logerr)
      }

      if( servertoken && servertoken != clienttoken ) {
        si.log('auth','token-mismatch',clienttoken,servertoken)
        useract.logout({token:servertoken},logerr)
      }

      try { req.logout() } catch(err) { logerr(err) }
      
      var redirect = redirection(req,res,'logout')

      respond(res,redirect.win,{ok:true})
    }

    
    routes[opts.urlpath.instance] = function(req,res,next) {
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


    routes[opts.urlpath.register] = function(req,res,next) {
      var details = {}
      _.each(opts.register.fields,function(field,alias){
        var input = _.isString(alias) ? alias : field
        var value = req.body[input]
        if( !_.isUndefined(value) ) {
          details[field] = value
        }
      })

      var redirect = redirection(req,res,'register')

      useract.register(details,function(err,out){
        if( err || !out.ok ) { respond(res,redirect.fail,{ok:false}) }

        useract.login({nick:out.user.nick,auto:true},function(err,out){
          if( err || !out.ok ) { respond(res,redirect.fail,{ok:false}) }

          req.seneca.user  = out.user
          req.seneca.login = out.login
          res.cookie(opts.tokenkey,req.seneca.login.token)

          respond(res,redirect.win,{
            ok:    out.ok,
            user:  out.user,
            login: out.login
          })
        })
      })
    }
    

    _.each( opts.service, function(conf,service){

      routes['/auth/'+service] = function(req,res,next){
        pp_auth[service](req,res,function(err) {
          if( err) return next(err);
        })
      }

      routes['/auth/'+service+'/callback'] = function(req,res,next){
        pp_auth[service](req,res,function(err) {
          if( err) return next(err);

          afterlogin(err,next,req,res)
        })
      }
    })


    var dispatcher = dispatch(routes)

    return function(req,res,next){
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


  cb(null,{
    service: buildservice()
  })
}
