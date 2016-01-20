/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
'use strict'

// External modules.
var _ = require('lodash')
var AuthUrlmatcher = require('auth-urlmatcher')
var AuthToken = require('auth-token-cookie')

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

  internals.load_default_express_plugins = function () {
    // External seneca-auth modules
    var AuthRedirect = require('auth-redirect')

    seneca.use(require('./lib/user-management'), internals.options)
    seneca.use(require('./lib/express-utility'))
    seneca.use(AuthUrlmatcher)
    seneca.use(require('./lib/express-auth'), internals.options)
    seneca.use(AuthToken, internals.options)
    seneca.use(AuthRedirect, internals.options.redirect || {})
    seneca.use(AuthUrlmatcher)
  }

  internals.load_default_hapi_plugins = function () {
    seneca.use(AuthToken, internals.options)
    seneca.use(AuthUrlmatcher)
    seneca.use(require('./lib/hapi-auth'), internals.options)
    seneca.use(require('./lib/hapi-utility'))
    seneca.use(require('./lib/user-management'), internals.options)
  }

  internals.choose_framework = function (){
    if ('express' === internals.options.framework) {
      internals.load_default_express_plugins()
    }
    else {
      internals.load_default_hapi_plugins()
    }
  }

  internals.migrate_options = function() {
    if (internals.options.service || internals.options.sendemail || internals.options.email) {
      throw error('<' + (internals.options.service ? 'service' : (internals.options.sendemail ? 'sendemail' : 'email')) +
        '> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }

    if (internals.options.tokenkey) {
      seneca.log('<tokenkey> option is deprecated, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }

    if (seneca.options().plugin.web && seneca.options().plugin.web.framework){
      internals.options.framework = seneca.options().plugin.web.framework
    }

    if (_.indexOf(internals.accepted_framworks, internals.options.framework) === -1) {
      throw error('Framework type <' + internals.options.framework + '> not supported.')
    }
  }

  internals.migrate_options()
  internals.choose_framework()

  var m
  if ((m = internals.options.prefix.match(/^(.*)\/+$/))) {
    internals.options.prefix = m[1]
  }

  seneca.ready()

  return {
    name: 'auth'
  }
}
