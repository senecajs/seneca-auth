/* Copyright (c) 2012-2013 Richard Rodger, MIT License */
"use strict";

var util              = require('util')
var async             = require('async')
var S                 = require('string')
var buffer            = require('buffer')
var passport          = require('passport')
var _                 = require('underscore')

var localProvider     = require('./provider/local.js')
var ServiceRouter     = require('./../lib/ServiceRouter.js')
var Access            = require('./../lib/Access.js')
var AuthManagement    = require('./../lib/AuthManagement.js')


// TODO: test without using express


module.exports = function auth( options ) {
  var seneca = this
  var plugin = 'auth'

  configurePassport(passport)

  seneca.add({role: plugin, cmd: 'login'}, function(args, done) {
    passport.authenticate('local', { session: false })(args.req$, args.res$, function(err) {
      // TODO: set cookie
      done(err)
    })
  })

  seneca.add({role: plugin, cmd: 'cookie-set'}, function(args, done) {
    
  })

  seneca.depends(plugin, ['web', 'user'])

  // public
  seneca.act('role:web', {
    use: {
      prefix: '/auth',
      pin: {role: 'auth', cmd: '*'},
      startware: passport.initialize(),
      map: {
        login:            { POST: true },
        register:         { POST: true },
        instance:         { GET:  true },
        create_reset:     { POST: true },
        execute_reset:    { POST: true },
        confirm:          { POST: true },
      }
    }
  })

  seneca.act('role:web',{use:{
    prefix:'/auth',
    pin:{role:'auth',cmd:'*'},
//    startware: secureMiddleware(),
    map:{
      logout:           { GET:  true },
      update_user:      { POST: true },
      change_password:  { POST: true },
    }
  }})
  // private


  seneca.add({ role: plugin, cmd: 'register_service' },   cmd_register_service)

  function cmd_register_service(args, callback) {
    seneca.log.info('registering auth service ['+args.service+']')
    passport.use(args.service, args.plugin)
//    self.registerService(args.service, args.conf)
    callback()
  }

  localProvider(seneca)

  return {
    name: plugin
  }
}


function configurePassport(passport) {


  passport.serializeUser(function(user, done) {
    done(null, user)
  })

  passport.deserializeUser(function(id, done) {
    done(null)
  })
}
