/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
'use strict'

// External modules.
var _ = require('lodash')
var AuthUrlmatcher = require('auth-urlmatcher')
var AuthToken = require('auth-token-cookie')

// Internal modules
var UserManagement = require('./lib/user-management')
var AuthRedirect = require('auth-redirect')
var LocalStrategy = require('seneca-local-auth')

var Utility = require('./lib/common-utility')
var ExpressAuth = require('./lib/express-auth')

var HapiAuth = require('./lib/hapi-auth')

// Load configuration
var DefaultOptions = require('./default-options.js')

var error = require('eraro')({
  package: 'auth'
})

module.exports = function auth (opts) {
  var seneca = this

  var internals = {}
  internals.accepted_framworks = [
    'express',
    'hapi'
  ]

  // using seneca.util.deepextend here, as there are sub properties
  internals.options = seneca.util.deepextend(DefaultOptions, opts)

  internals.load_common_plugins = function () {
    seneca.use(AuthToken, internals.options)
    seneca.use(AuthUrlmatcher, internals.options)
    seneca.use(Utility, internals.options)
    seneca.use(UserManagement, internals.options)
    seneca.use(AuthRedirect, internals.options.redirect || {})
  }

  internals.load_default_express_plugins = function () {
    internals.load_common_plugins()
    seneca.use(ExpressAuth, internals.options)
    seneca.use(LocalStrategy, internals.options)
  }

  internals.load_default_hapi_plugins = function () {
    internals.load_common_plugins()
    seneca.use(HapiAuth, internals.options)
    seneca.use(LocalStrategy, internals.options)
  }

  internals.choose_framework = function () {
    if (internals.options.framework === 'express') {
      internals.load_default_express_plugins()
    }
    else {
      internals.load_default_hapi_plugins()
    }
  }

  internals.migrate_options = function () {
    if (internals.options.service || internals.options.sendemail || internals.options.email) {
      throw error('<' + (internals.options.service ? 'service' : (internals.options.sendemail ? 'sendemail' : 'email')) +
        '> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }

    if (internals.options.tokenkey) {
      seneca.log('<tokenkey> option is deprecated, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }

    if (seneca.options().plugin.web && seneca.options().plugin.web.framework) {
      internals.options.framework = seneca.options().plugin.web.framework
    }

    if (_.indexOf(internals.accepted_framworks, internals.options.framework) === -1) {
      throw error('Framework type <' + internals.options.framework + '> not supported.')
    }
  }


  internals.migrate_options()

  var m = internals.options.prefix.match(/^(.*)\/+$/)
  if (m) {
    internals.options.prefix = m[1]
  }

  internals.choose_framework()

  return {
    name: 'auth'
  }
}
