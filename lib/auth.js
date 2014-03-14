/* Copyright (c) 2012-2013 Richard Rodger, MIT License */
"use strict";


var util     = require('util')
var buffer   = require('buffer')


var _               = require('underscore')
var async           = require('async')
var S               = require('string')
var Cookies         = require('cookies')
var passport        = require('passport')
var defaultOptions  = require('./default-options.js')

var HttpCode        = require('./HttpCode.js')

// TODO: test without using express

// TODO: move to seneca-web
function sendjson( code, res, out ) {
  // TODO: need killcircles
  var outjson = JSON.stringify(out)
  res.writeHead( code, {
    'Content-Type':   'application/json',
    'Cache-Control':  'private, max-age=0, no-cache, no-store',
    'Content-Length': buffer.Buffer.byteLength(outjson)
  })
  res.end( outjson )
}

// TODO: move to seneca-web
function sendredirect(code, res, url) {
  res.writeHead(HttpCode.MOVED_PERMANENTLY, {Location: url})
  res.end()
}


module.exports = function auth( options ) {
  var seneca = this
  var plugin = 'auth'


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

  seneca.add({ role: plugin, cmd: 'register_service' },   cmd_register_service)

  seneca.add({ role: plugin, cmd: 'login' },              cmd_login)
  seneca.add({ role: plugin, trigger: 'service-login' },  trigger_service_login)
  seneca.add({ role: plugin, wrap: 'user' },              wrap_user)
  seneca.add({ init: plugin },                            init)

  seneca.add({role: plugin, cmd: 'register'},             cmd_register)
  seneca.add({role: plugin, cmd: 'instance'},             cmd_instance)
  seneca.add({role: plugin, cmd: 'clean'},                cmd_clean)

  seneca.add({role: plugin, cmd: 'create_reset'},         cmd_create_reset)
  seneca.add({role: plugin, cmd: 'load_reset'},           cmd_load_reset)
  seneca.add({role: plugin, cmd: 'execute_reset'},        cmd_execute_reset)
  seneca.add({role: plugin, cmd: 'confirm'},              cmd_confirm)

  seneca.add({role: plugin, cmd: 'update_user'},          cmd_update_user)
  seneca.add({role: plugin, cmd: 'change_password'},      cmd_change_password)




  function aliasfields(which, src) {
    var out = _.clone(src)
    _.each(options[which].fields, function(field, alias) {
      var input = _.isString(alias) ? alias : field
      var value = src[input]

      if( !_.isUndefined(value) ) {
        out[field] = value
      }
    })
    return out
  }



  var userent = seneca.make$('sys/user')
  var useract = seneca.pin({role: 'user', cmd: '*'})

  if( options.sendemail ) {
    seneca.depends(plugin, ['mail'])
    var mailact = seneca.pin({role: 'mail', cmd: '*'})
  }

  passport.serializeUser(function(user, done) {
    done(null, user.user.id)
  })

  passport.deserializeUser(function(id, done) {
    done(null)
  })

  function cmd_login( args, done ) {
    var nick = args.nick || ( args.user && args.user.nick )

    if( nick && args.auto ) {
      seneca.act('role:user,cmd:login,auto:true,nick:' + nick, function(err, out) {
        if( err ) return done(err)

        do_web(out.user, out.login)
      })
    }
    else do_web( args.user, args.login )

    function do_web( user, login ) {
      if( args.req$ && args.req$.seneca ) {
        args.req$.seneca.user = user
        args.req$.seneca.login = login

        args.res$.seneca.cookies.set(options.tokenkey, login.token)

        done(null, {ok: true, user: user, login: login})
      }
      else return done(null, {ok: false})
    }
  }

  // default service login trigger
  function trigger_service_login( args, done ) {
    var q = {}
    if( args.identifier ) {
      q[args.service + '_id'] = args.identifier
    } else {
      var err = new Error('no identifier')
      err.code = 'no_identifier'
      return done(err, undefined)
    }

    userent.load$(q, seneca.err(done, function(user) {
      var props = {
        nick: args.nick,
        email: args.email,
        name: args.name,
        active: true,
        service: {}
      }
      props[args.service + '_id'] = args.identifier

      props.service[args.service] = {
        credentials: args.credentials,
        userdata: args.userdata,
        when: args.when
      }


      if( !user ) {
        useract.register( props, seneca.err(done, function(out) {
          done(null, out.user)
        }))
      }
      else {
        user.data$( seneca.util.deepextend( user.data$(), props ) )
        user.save$( done )
      }
    }))
  }




  function wrap_user( args, done ) {
    this.act({
      role: 'util',
      cmd: 'ensure_entity',
      pin: args.pin,
      entmap: {
        user: userent,
      }
    })

    this.wrap(args.pin, function(args, done) {
      args.user = args.user || (args.req$ && args.req$.seneca && args.req$.seneca.user ) || null
      this.parent(args, done)
    })

    done()
  }


  function cmd_register( args, done ) {
    var seneca = this

    var details = aliasfields('register', args.data)
    var req = args.req$
    var res = args.res$

    useract.register(details, function(err, out) {
      if( err || !out.ok ) { return done(err, out) }

      useract.login({nick: out.user.nick, auto: true}, function(err, out) {
        if( err || !out.ok ) { return done(err, out) }

        if( options.sendemail ) {
          mailact.send( {code: options.email.code.register,
                         to: out.user.email,
                         subject: options.email.subject.register,
                         content: {name: out.user.name,
                                  confirmcode: out.user.confirmcode,
                                  confirmlink: options.email.content.confirmlinkprefix + '/' + out.user.confirmcode}} )
        }

        if( req && req.seneca ) {
          req.seneca.user  = out.user
          req.seneca.login = out.login

          if( res && res.seneca ) {
            res.seneca.cookies.set(options.tokenkey, req.seneca.login.token)
          }
        }

        done(null, {
          ok:    out.ok,
          user:  out.user,
          login: out.login
        })
      })
    })
  }


  function cmd_create_reset( args, done ) {
    var seneca = this

    var nick  = args.data.nick || args.data.username
    var email = args.data.email

    var args = {}
    if( void 0 != nick )  args.nick  = nick
    if( void 0 != email ) args.email = email

    useract.create_reset( args, function( err, out ) {
      if( err || !out.ok ) return done(err, out)

      if( options.sendemail ) {
        mailact.send( {code: options.email.code.create_reset,
                       to: out.user.email,
                       subject: options.email.subject.create_reset,
                       content: {name: out.user.name,
                                resetlink: options.email.content.resetlinkprefix + '/' + out.reset.id}} )
      }

      done(null, {
        ok: out.ok,
      })
    })
  }



  function cmd_load_reset( args, done ) {
    var seneca = this

    var token = args.data.token

    useract.load_reset( {token: token}, function( err, out ) {
      if( err || !out.ok ) return done(err, out)

      done(null, {
        ok: out.ok,
        nick: out.user.nick
      })
    })
  }


  function cmd_execute_reset( args, done ) {

    var token    = args.data.token
    var password = args.data.password
    var repeat   = args.data.repeat

    useract.execute_reset( {token: token, password: password, repeat: repeat}, function( err, out ) {
      if( err || !out.ok ) return done(err, out)

      done(null, {
        ok: out.ok,
      })
    })
  }


  function cmd_confirm( args, done ) {

    var code = args.data.code
    var req = args.req$

    useract.confirm( {code: code}, function( err, out ) {
      if( err || !out.ok ) return done(err, out)

      return done(null, {
        ok: out.ok,
      })
    })
  }


  function cmd_update_user( args, done ) {

    var user = args.user
    var data = _.pick( args.data, options.user.updatefields )

    function check_uniq(field, next) {
      if( data[field] ) {
        userent.load$({nick: data[field]}, function(err, user) {
          if( err ) return next(err)
          if( user ) return next({ok: false, why: 'user-exists-' + field})
          return next(null, field)
        })
      } else next(null, field)
    }

    async.mapSeries(['name', 'email'], check_uniq, function(err) {
      if( err ) {
        if( err.ok ) return done(null, err)
        return done(err)
      }
      else return do_update()
    })

    function do_update() {
      user.data$(data).save$(function(err, user) {
        if( err ) return done(err)
        return done( null, {ok: true, user: user} )
      })
    }
  }


  function cmd_change_password( args, done ) {
    var seneca = this

    var user = args.user

    useract.change_password({user: user, password: args.data.password, repeat: args.data.repeat}, function(err, out) {
      if( err ) return done(err)
      return done(null, out)
    })
  }



  function cmd_instance( args, done ) {
    var seneca = this

    var user  = args.user
    var login = args.login

    seneca.act({role: plugin, cmd: 'clean', user: user, login: login}, function(err, out) {
      if( err ) return done( err )
      out.ok = true

      out = seneca.util.clean( out )

      done( null, out )
    })
  }



  function cmd_clean( args, done ) {
    var seneca = this

    var user  = args.user  && seneca.util.clean( args.user.data$() )  || null
    var login = args.login && seneca.util.clean( args.login.data$() ) || null

    if( user ) {
      delete user.pass
      delete user.salt
      delete user.active
      //delete user.accounts // TODO: figure out where this comes from
      delete user.confirmcode
    }

    done(null, {user: user, login: login})
  }


  seneca.util.recurse(
    _.keys(options.service),
    function(service, next) {

      var conf = _.extend({
        urlhost: 'http://127.0.0.1:3333'
      }, options.service[service])

      seneca.act({
        role: plugin,
        hook: 'service-init',
        service: service,
        conf: conf,
        passport: passport
      }, function(err) {
        next(err)
      })
    },
    function(err) {
      if(err) {
        seneca.log.error(err)
      }
    }
  )



  function init( args, done ) {
    done()
  }


  var config = {prefix: options.prefix, redirects: {}}

  if( options.defaultpages ) {
    _.each(options.loginpages, function(loginpage) {
      config.redirects[loginpage.path] = {redirect: loginpage.redirect, title: loginpage.title}
    })
  }

  function cmd_register_service(args, callback) {

  }

  function buildService() {
    return Service._requestHandler
  }


  seneca.act({
    role: 'web',
    plugin: plugin,
    config: config,
    use: {
      prefix: options.prefix,
      pin: {role: plugin, cmd: '*'},
      startware: buildService(),
      map: {
        register:        { POST: forwardRequestToService, data: true },
        instance:        { GET:  forwardRequestToService },
        create_reset:    { POST: forwardRequestToService, data: true },
        load_reset:      { POST: forwardRequestToService, data: true },
        execute_reset:   { POST: forwardRequestToService, data: true },
        confirm:         { POST: forwardRequestToService, data: true },
        update_user:     { POST: forwardRequestToService, data: true },
        change_password: { POST: forwardRequestToService, data: true },
      }
    }
  })


  return {
    name: plugin
  }
}
