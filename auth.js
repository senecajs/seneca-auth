/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
"use strict";


var util = require('util')


var _       = require('underscore')
var Cookies = require('cookies')


module.exports = function auth( options ) {
  var seneca = this

  options = seneca.util.deepextend({
    prefix:'/auth/',
    register: {
      autologin: true
    }
  },options)
  

  var entopts = seneca.options().entity || {}
  seneca.options(seneca.util.deepextend({
    entity:{
      hide:{ 
        'sys/user': {pass:1,salt:1} ,
        'sys/login': {token:1} 
      }
    }
  },entopts))
  

  /*
  seneca.add('role:auth,info:user', info_user)

  seneca.add('role:auth,route:login',           
             { nick:{string$:true} },
             route_login)

  seneca.add('role:auth,route:logout',           
             route_logout)
   */


  seneca.add('role:auth,route:register', require('./route_register')(options))
  seneca.add('role:auth,route:user',     route_user)

  seneca.add('role:auth,hook:mark_auth', hook_mark_auth)


  /*
  seneca.add('role:auth,route:clean',           route_clean)
  seneca.add('role:auth,route:create_reset',    route_create_reset)
  seneca.add('role:auth,route:load_reset',      route_load_reset)
  seneca.add('role:auth,route:execute_reset',   route_execute_reset)
  seneca.add('role:auth,route:confirm',         route_confirm)
  seneca.add('role:auth,route:update_user',     route_update_user)
  seneca.add('role:auth,route:change_password', route_change_password)

  // legacy
  seneca.add('role:auth,route:instance', route_user)

  seneca.add('role:auth, trigger:service-login', trigger_service_login)
  seneca.add('role:auth, wrap:user',             wrap_user)
  seneca.add('role:auth, hook:service-init',     hook_service_init)
   */
  
  seneca.add({ init:'auth' }, init)





  function route_user( args, done ) {
    done( null, { ok:true, user:args.user, login:args.login} )
  }


  function hook_mark_auth( args, done ) {
    new Cookies(args.req$,args.res$)
      .set(options.tokenkey,args.login.id)
    args.ok = true
    done(null,args)
  }
  




  function init( args, done ) {
    var seneca = this


    function startware( req, res, next ) {
      req.params = req.params || {}
      req.params.user  = req.params.user  || (req.seneca && req.seneca.user)
      req.params.login = req.params.login || (req.seneca && req.seneca.login)
      next()
    }

    seneca.act({
      role: 'util',
      cmd:  'ensure_entity',
      pin:  'role:auth,route:*',
      entmap:{
        user: seneca.make('sys/user'),
      }
    })

    seneca.act({
      role:   'web',
      use:{
        prefix:    options.prefix,
        pin:       {role:'auth',route:'*'},
        startware: startware,
        map:{
          user:            { GET:true },

          login:           { POST:true, data:true },
          logout:          { POST:true, data:true },
          register:        { POST:true, data:true },
          create_reset:    { POST:true, data:true },
          load_reset:      { POST:true, data:true },
          execute_reset:   { POST:true, data:true },
          confirm:         { POST:true, data:true },
          update_user:     { POST:true, data:true },
          change_password: { POST:true, data:true },

          // legacy
          instance:        { GET:true },
        }
      }
    })
    
    done()
  }
}
