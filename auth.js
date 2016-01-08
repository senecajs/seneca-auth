/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
'use strict'

// Load configuration
var DefaultOptions = require('./default-options.js')

// External seneca-auth modules
var AuthToken = require('auth-token-cookie')
var AuthRedirect = require('auth-redirect')
var AuthUrlmatcher = require('auth-urlmatcher')

var error = require('eraro')({
  package: 'auth'
})

module.exports = function auth (options) {
  var seneca = this

  seneca.depends('auth', ['web', 'user'])

  // using seneca.util.deepextend here, as there are sub properties
  options = seneca.util.deepextend(DefaultOptions, options)

  function migrate_options () {
    if (options.service || options.sendemail || options.email) {
      throw error('<' + (options.service ? 'service' : (options.sendemail ? 'sendemail' : 'email')) +
        '> option is no longer supported, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }

    if (options.tokenkey) {
      seneca.log('<tokenkey> option is deprecated, please check seneca-auth documentation for migrating to new version of seneca-auth')
    }
  }

  migrate_options()
  load_default_plugins()

  var m
  if ((m = options.prefix.match(/^(.*)\/+$/))) {
    options.prefix = m[1]
  }

  // define seneca actions
  // seneca.add({ role:'auth', wrap:'user' },      wrap_user)
  seneca.add({init: 'auth'}, init)

  function load_default_plugins () {
    seneca.use(require('./lib/user-management'), options)
    seneca.use(require('./lib/utility'))
    seneca.use(AuthUrlmatcher)
    seneca.use(require('./lib/express-auth'), options)
    seneca.use(AuthToken)
    seneca.use(AuthRedirect, options.redirect || {})
    seneca.use(AuthUrlmatcher)
  }

  function init (msg, respond) {
    respond()
  }

  seneca.ready()

  return {
    name: 'auth'
  }
}
