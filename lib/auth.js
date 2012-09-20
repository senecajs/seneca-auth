/* Copyright (c) 2012 Richard Rodger */

"use strict";



var _ = require('underscore')

var passport = require('passport')

var passport_local   = require('passport-local')
//var passport_twitter = require('passport-twitter')


var eyes = require('eyes')



var config = require('./config.mine')



var LocalStrategy   = passport_local.Strategy
//var TwitterStrategy = passport_twitter.Strategy
  

/*
var users = [
    { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' }
  , { id: 2, username: 'joe', password: 'birthday', email: 'joe@example.com' }
];

function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

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
    opts = init_opts

    useract = si.pin({role:'user',cmd:'*'})

    useract.entity({kind:'user'},si.err(cb,function(user){
      userent = user
    }))


    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      userent.load$({id:id},si.err(done,function(user){
        done(null, user)
      }))
    });


    passport.use(new LocalStrategy(
      function(username, password, done) {

        userent.load$({nick:username},si.err(done,function(user){
          if( !user ) {
            user.load$({email:username},si.err(done,function(user){
              finish(user)
            }))
          }
          else finish(user);
        }))


        function finish(user) {
          if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }

          useract.verify_password({proposed:password,pass:user.pass,salt:user.salt}, si.err(done,function(out){
            if( out.ok ) { 
              return done(null, user)
            }
            else {
              return done(null, false, { message: 'Invalid password' });
            }
          }))
        }
      }
    ))
 

/*
    passport.use(new TwitterStrategy(
      {
        consumerKey: config.strategy.twitter.key,
        consumerSecret: config.strategy.twitter.secret,
        callbackURL: "http://local.host:3333/auth/twitter/callback"
      },
      function(token, tokenSecret, profile, done) {
        eyes.inspect(profile)
        var user = profile
        done(null,user)
      }
    ));
*/

    useract.register({
      nick:'u1',
      email:'u1@example.com',
      name:'u1',
      active:true,
      password:'u1'
    },si.err(cb,function(user){
      console.log(user)
      cb()
    }))
  }



  self.service = function(opts,cb) {
    var pp_init    = passport.initialize()
    var pp_session = passport.session()
    var pp_auth_local    = passport.authenticate( 'local', { failureRedirect: '/failed' })
    var pp_auth_twitter  = passport.authenticate( 'twitter', { successRedirect: '/success', failureRedirect: '/failed' })

    return function(req,res,next){
      pp_init(req,res,function(err){
        if( err) return next(err);

        pp_session(req,res,function(err){
          if( err) return next(err);

          if( req.isAuthenticated() && req.seneca ) {
            req.seneca.user = req.user
          }



          if( '/auth/login' == req.url ) {
            req.query = {username:'u1',password:'u1'}
            pp_auth_local(req,res,function(err) {
              console.log('pp_auth_local:'+err)
              if( err) return next(err);
              res.redirect('/ok');
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



module.exports.plugin = function() { return module.exports }

