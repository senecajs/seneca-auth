/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


module.exports = function(auth,options) {
  return function route_login( args, done ) {
    var seneca  = this
    var req     = args.req$
    var res     = args.res$

    auth['local'](req,res,function(err){
      if( err ) return done(err);

      done(null,res.seneca.auth)
    })
  }
}
