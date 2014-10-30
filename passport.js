/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


// NOTE: THIS IS NOT A SENECA PLUGIN


var passport       = require('passport')
var passport_local = require('passport-local')


passport.serializeUser(function(user, done) {
  done(null, user.user.id);
})

passport.deserializeUser(function(id, done) {
  done(null)
})

var LocalStrategy = passport_local.Strategy


module.exports = function(seneca,options) {

  seneca.add('role:auth,hook:strategy_init,strategy:local', 
             hook_strategy_init_local)


  function hook_strategy_init_local( args, done ) {
    passport.use(new LocalStrategy(
      function (username, password, done) {
        seneca.act(
          'role:user,cmd:login', 
          {nick:username, email:username, password:password}, 
          done
        )}
    ))

    var auth = function(req,res,next){
      passport.authenticate('local', {}, function(err,data,info){
        req.seneca.act('role:auth,hook:auth',{
          strategy:'local',
          err:err,
          data:data,
          info:info
        },function(err){
          next(err);
        })

      })(req,res,next)
    }

    done(null,{auth:auth})
  }


  return passport;
}

