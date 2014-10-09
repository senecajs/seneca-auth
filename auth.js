/* Copyright (c) 2012-2014 Richard Rodger, MIT License */
"use strict";


var util = require('util')


var _ = require('underscore')


module.exports = function auth( options ) {
  var seneca = this

  options = seneca.util.deepextend({
    prefix:'/auth/'
  },options)
  


  /*
  seneca.add('role:auth,info:user', info_user)

  seneca.add('role:auth,cmd:login',           
             { nick:{string$:true} },
             cmd_login)

  seneca.add('role:auth,cmd:logout',           
             cmd_logout)
   */

  //seneca.add('role:auth,cmd:register',        cmd_register)
  seneca.add('role:auth,cmd:user',            cmd_user)
  /*
  seneca.add('role:auth,cmd:clean',           cmd_clean)
  seneca.add('role:auth,cmd:create_reset',    cmd_create_reset)
  seneca.add('role:auth,cmd:load_reset',      cmd_load_reset)
  seneca.add('role:auth,cmd:execute_reset',   cmd_execute_reset)
  seneca.add('role:auth,cmd:confirm',         cmd_confirm)
  seneca.add('role:auth,cmd:update_user',     cmd_update_user)
  seneca.add('role:auth,cmd:change_password', cmd_change_password)

  // legacy
  seneca.add('role:auth,cmd:instance', cmd_user)

  seneca.add('role:auth, trigger:service-login', trigger_service_login)
  seneca.add('role:auth, wrap:user',             wrap_user)
  seneca.add('role:auth, hook:service-init',     hook_service_init)
   */
  
  seneca.add({ init:'auth' }, init)



  function cmd_user( args, done ) {
    //console.log(args)
    done( null, { ok:true, user:args.user, login:args.login} )
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
      role:   'web',
      use:{
        prefix:    options.prefix,
        pin:       {role:'auth',cmd:'*'},
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
