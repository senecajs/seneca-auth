/* Copyright (c) 2012 Richard Rodger */

"use strict";



var _ = require('underscore')

var passport = require('passport')

var passport_local   = require('passport-local')
var passport_twitter = require('passport-twitter')


var eyes = require('eyes')



var config = require('./config.mine')



var LocalStrategy   = passport_local.Strategy
var TwitterStrategy = passport_twitter.Strategy
  

/*

Redirect Cases
- JSON API only
- HTTP redirect only
- JSON, but redirect if query param redirect=yes
- redirect param url overides win url override - optional
- redirect param fail overides fail url override - optional

*/



function AuthPlugin() {
  var self = {}
  self.name = 'auth'


  var si
  var opts
  var useract
  var userent


  self.init = function(init_si,init_opts,cb){
    si   = init_si

    // need an override here!
    opts = _.extend({

      tokenkey:'seneca-login', // name of cookie

      service:{},

    },init_opts)


    // redirect settings, if redirecting
    //redirect:{
    //  win:'/account', // successful login url path
    //  fail:'/login'   // failed login url path
    //}

    useract = si.pin({role:'user',cmd:'*'})

    useract.entity({kind:'user'},si.err(cb,function(user){
      userent = user
    }))


    passport.serializeUser(function(user, done) {
      console.log('SERIALIZE USER:'+user)
      done(null, user.user.id);
    });

    passport.deserializeUser(function(id, done) {
      console.log('DESERIALIZE USER:'+id)
      done(null)
      //userent.load$({id:id},si.err(done,function(user){
      //  done(null, user)
      //}))
    });



    passport.use(new LocalStrategy(
      function(username, password, done) {

        // need to be able to handle nick and email
        si.act({role:'user',cmd:'login',nick:username,password:password},si.err(done,function(out){
          return done(null,out)

          /*
          if( out.pass ) {
              return done(null, out)
          }
          else {
            return done(null, false, { message: 'Invalid password' });
          }
          */

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
        si.act({role:'user',cmd:'auth',token:token},si.err(cb,function(out){        
          console.log('INIT SESSION')
          console.dir(out)

          // FIX: make consisten
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


    return function(req,res,next){
      pp_init(req,res,function(err){
        if( err) return next(err);

        init_session(req,res,function(err){
          if( err) return next(err);


          if( 0 == req.url.indexOf('/auth/login') ) {
            console.dir(req.body)
            console.dir(opts)

            var query = _.extend({},req.query||{},req.body||{})
            req.query = query
            
            pp_auth_local(req,res,function(err) {
              console.log('pp_auth_local err:'+err)
              if( err) return next(err);

              if( req.user.pass ) {
                // rename passport req.user prop
                req.seneca.user = req.user.user
                req.seneca.login = req.user.login
                res.cookie(opts.tag,req.seneca.login.token)

                if( opts.redirect ) {
                  res.redirect( opts.redirect.win )
                }
                else {
                  // FIX: passing back everything!!!
                  res.send({
                    ok:true,
                    user:req.seneca.user,
                    login:req.seneca.login
                  })
                }
              }
              else {
                delete req.user
                if( opts.redirect ) {
                  res.redirect( opts.redirect.fail )
                }
                else {
                  res.send({
                    ok:false
                  })
                }
              }
            })
          }
          
          else if( '/user/account' == req.url ) {
            if( req.isAuthenticated() ) {
              console.log(req.user)
              res.redirect('/user/details');
            }
            else {
              res.redirect('/user/refused');
            }
          }    

          else if( '/auth/logout' == req.url ) {
            req.logout()
            res.redirect('/index');
          }    

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
        })
      })
    }
  }

  return self
}


module.exports = new AuthPlugin()


