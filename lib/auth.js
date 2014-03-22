/* Copyright (c) 2012-2013 Richard Rodger, MIT License */
"use strict";

var util              = require('util')
var async             = require('async')
var S                 = require('string')
var buffer            = require('buffer')
var passport          = require('passport')
var _                 = require('underscore')

var ServiceRouter     = require('./ServiceRouter.js')
var defaultOptions    = require('./default-options.js')
var localProvider     = require('./provider/local.js')
var Access            = require('./Access.js')
var AuthManagement    = require('./AuthManagement.js')


// TODO: test without using express


module.exports = function auth( options ) {
  var seneca = this
  var plugin = 'auth'

  seneca.use('crypto-sign')

  seneca.depends(plugin, ['web', 'user'])


  // using seneca.util.deepextend here, as there are sub properties
  options = seneca.util.deepextend(defaultOptions, options)


  var m = options.prefix.match(/^(.*)\/+$/)
  if( m ) {
    options.prefix = m[1]
  }

  _.each(options.urlpath, function(v, k) {
    options.urlpath[k] = '/'==v[0] ? v : options.prefix + '/' + v
  })

  seneca.add({ init: plugin }, cmd_init)

  AuthManagement.register(plugin, seneca, options)
  Access.register(plugin, seneca, options)

  var userent = seneca.make$('sys/user')
  var useract = seneca.pin({role: 'user', cmd: '*'})

  if( options.sendemail ) {
    seneca.depends(plugin, ['mail'])
  }

  passport.serializeUser(function(user, done) {
    done(null, user.user.id)
  })

  passport.deserializeUser(function(id, done) {
    done(null)
  })



  function cmd_init( args, done ) {
    done()
  }

  var serviceRouter = new ServiceRouter(options, seneca, plugin, passport)


  var config = {prefix: options.prefix, redirects: {}}

  if( options.defaultpages ) {
    _.each(options.loginpages, function(loginpage) {
      config.redirects[loginpage.path] = {redirect: loginpage.redirect, title: loginpage.title}
    })
  }

  var forwardRequestToService = serviceRouter.forwardRequestToService()

  seneca.act({
    role: 'web',
    plugin: plugin,
    config: config,
    use: {
      prefix: options.prefix,
      pin: {role: plugin, cmd: '*'},
      startware: serviceRouter.middleware(),
      map: {
        register:        { POST: forwardRequestToService, data: true },
        instance:        { GET:  forwardRequestToService },             // logged in instance
        create_reset:    { POST: forwardRequestToService, data: true }, // request pwd reset
        load_reset:      { POST: forwardRequestToService, data: true },
        execute_reset:   { POST: forwardRequestToService, data: true }, // reset pwd
        confirm:         { POST: forwardRequestToService, data: true }, // confirm user creation
        update_user:     { POST: forwardRequestToService, data: true },
        change_password: { POST: forwardRequestToService, data: true },
      }
    }
  })

  localProvider(seneca)

  return {
    name: plugin
  }
}

