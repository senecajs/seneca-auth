/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


module.exports = function(options) {
  return function route_register( args, done ) {
    var seneca  = this
    var details = args.data
    var req     = args.req$
    var res     = args.res$

    seneca
      .start()

      .wait('role:user,cmd:register',details)
      .step(function(out){
        return out.ok ? out : result(null,out)
      })

      .if( options.register.autologin )
      .wait('role:user,cmd:login,user:$.user,auto:true' )
      .step(function(out){
        return out.ok ? out : result(null,out)
      })
      .wait('role:auth,hook:mark_auth,user:$.user,login:$.login')
      .endif()

      .end(result)


    function result(err, out){
      if( err ) return done(err);

      var data = {
        ok: !err && out.ok
      }

      if( out.why ) {
        data.why = out.why
      }

      if( out.user )  { 
        data.user = out.user 
        req.seneca.user = data.user
      }
      
      if( out.login ) {
        data.login = out.login
        req.seneca.login = data.login
      }
      
      done( err, data )
    }

  }
}



/*
module.exports = function(options) {
  return function route_register( args, done ) {
    var seneca  = this
    var details = args.data
    var req     = args.req$
    var res     = args.res$

    seneca.act(
      'role:user,cmd:register',
      details,

      function(err,out) {
        if( err || !out.ok ) return done(err,out);

        if( options.register.autologin ) {
          seneca.act(
            'role:user,cmd:login',
            {user:out.user,auto:true},
            
            function(err,out){
              if( err || !out.ok ) return done(err,out);

              seneca.act(
                'role:auth,hook:mark_auth',
                out,
                do_result)
            })
        }
        else do_result(null,out)

        function do_result(err,out) {
          if( err ) return done(err);

          var data = {
            ok: !err && out.ok
          }

          if( out.why ) {
            data.why = out.why
          }

          if( out.user )  { 
            data.user = out.user 
            req.seneca.user = data.user
          }

          if( out.login ) {
            data.login = out.login
            req.seneca.login = data.login
          }

          done( err, data )
        }
      })
  }
}
*/
