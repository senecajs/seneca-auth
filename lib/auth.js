/* Copyright (c) 2012 Richard Rodger */

"use strict";



var _        = require('underscore')
var S        = require('string')
var gex      = require('gex')

var dispatch = require('dispatch')

var passport = require('passport')
var passport_local   = require('passport-local')
var passport_twitter = require('passport-twitter')






var LocalStrategy   = passport_local.Strategy
var TwitterStrategy = passport_twitter.Strategy
  




function AuthPlugin() {
  var self = {}
  self.name = 'auth'


  var si
  var opts
  var useract
  var userent


  self.init = function(seneca,options,cb){
    si = seneca


    // use seneca.util.deepextend here
    opts = si.util.deepextend({

      tokenkey:'seneca-login', // name of cookie

      service:{},

      urlpath: {
        login:    '/auth/login',
        logout:   '/auth/logout',
        instance: '/auth/instance'
      },

      restrict: '/account',

      // redirect settings, if redirecting
      redirect:{
        always: false,
        win:'/',
        fail:'/',

        login:  {win:'/',fail:'/',},
        logout: {win:'/',fail:'/',}
      }

    },options)

    //console.dir(opts)

    si.add({role:self.name,cmd:'ping'},function(args,cb){
      cb(null,{rand:args.rand,when:new Date().getTime()})
    })



    useract = si.pin({role:'user',cmd:'*'})

    useract.entity({kind:'user'},si.err(cb,function(user){
      userent = user
    }))


    passport.serializeUser(function(user, done) {
      done(null, user.user.id);
    })

    passport.deserializeUser(function(id, done) {
      done(null)
    })



    passport.use(new LocalStrategy(
      function(username, password, done) {

        // need to be able to handle nick and email
        si.act({role:'user',cmd:'login',nick:username,password:password},si.err(done,function(out){
          return done(null,out)
        }))
      }
    ))
 


    if( opts.service.twitter ) {
      var conf = _.extend({
        urlhost:'http://local.host:3333'
      },opts.service.twitter)

      passport.use(new TwitterStrategy(
        {
          consumerKey: conf.key,
          consumerSecret: conf.secret,
          callbackURL: conf.urlhost+"/auth/twitter/callback"
        },
        function(token, tokenSecret, profile, done) {
          //console.dir(profile)

          userent.load$({nick:profile.username},si.err(done,function(user){
            if( !user ) {
              useract.register({nick:profile.username, password:''+Math.random()},si.err(done,function(user){
                console.log('reg:'+user)
                done(null,user)
              }))
            }
            else {
              console.log('found:'+user)
              done(null,user)
            }
          }))
        }
      ))
    }


    cb()
  }



  self.service = function() {
    var pp_init    = passport.initialize()
    //var pp_session = passport.session()

    var pp_auth_local    = passport.authenticate( 'local', {})


    var pp_auth_twitter  = function(req,res,next){
      var prefix = req.query.prefix
      console.log('prefix='+(prefix||''))

      res.cookie('oauth-url-prefix',prefix)

      passport.authenticate( 'twitter', function(err,user,info){
        if (err) { return next(err) }
        
        var prefix = req.cookies['oauth-url-prefix']
        res.clearCookie('oauth-url-prefix')

        var rurl = (prefix||'') + opts.redirect.loginfail
        if (user) { 
          rurl = (prefix||'') + opts.redirect.loginwin
        }
        
        console.log('rurl='+rurl)

        res.redirect( rurl )
      })(req,res,next)
    }



    function init_session(req,res,cb) {
      var token = req.cookies[opts.tokenkey]
      if( token ) {
        useract.auth({token:token},si.err(cb,function(out){        

          // FIX: make out."things ok" prop name consistent in seneca-user
          if( out.auth ) {
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
        //console.log('kind:'+kind+' spec:'+spec)

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



    function redirection(req,kind) {
      //console.dir(req)

      var redirect = false
      var ct = req.headers['content-type']

      //console.log('REDIR ct='+ct+' req.q='+JSON.stringify(req.query))

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

      //console.log('REDIR val='+redirect)

      return redirect
    }


    function logerr(err) {
      if( err ) return si.log('error',err);
    }

    var routes = {}

    routes[opts.urlpath.login] = {
      POST: function(req,res,next) {
        req.query = _.extend({},req.query||{},req.body||{})
        pp_auth_local(req,res,function(err) {
          if( err) return next(err);

          var redirect = redirection(req,'login')

          if( req.user.pass ) {
            // rename passport req.user prop
            req.seneca.user = req.user.user
            req.seneca.login = req.user.login
            res.cookie(opts.tokenkey,req.seneca.login.token)

            if( redirect ) {
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
            var out = {ok:false,why:req.user.why}
            delete req.user
            if( redirect ) {
              res.redirect( redirect.fail )
            }
            else {
              res.send(out)
            }
          }
          
        })
      }
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
      
      var redirect = redirection(req,'logout')

      // FIX: what about errors?
      if( redirect ) {
        res.redirect( redirect.win )
      }
      else {
        res.send({ok:true})
      }
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

          /*
          else if( 0 == req.url.indexOf('/auth/twitter') ) {
            pp_auth_twitter(req,res,function(err) {
              if( err) return next(err);
            })
          }

          else if( 0 == req.url.indexOf('/auth/twitter/callback') ) {
            pp_auth_twitter(req,res,function(err) {
              if( err) return next(err);
            })
          }

          else next();
          */

        })
      })
    }
  }

  return self
}


module.exports = new AuthPlugin()


