
var Access = {}

Access.register = function(plugin, seneca, options) {

//  seneca.add({ role: plugin, cmd: 'login' },              this._cmdLogin(seneca, options))
  seneca.add({ role: plugin, trigger: 'service-login' },  this._triggerServiceLogin(seneca))
  seneca.add({ role: plugin, wrap: 'user' },              this._wrapUser(seneca))
}

Access._cmdLogin = function(seneca, options) {
  var userent = seneca.make$('sys/user')

  return function(args, done ) {
    var nick = args.nick || ( args.user && args.user.nick )

    if( nick && args.auto ) {
      this.act('role:user,cmd:login,auto:true,nick:' + nick, function(err, out) {
        if( err ) return done(err)

        do_web(out.user, out.login)
      })
    }
    else do_web( args.user, args.login )

    function do_web( user, login ) {
      if( args.req$ && args.req$.seneca ) {
        args.req$.seneca.user = user
        args.req$.seneca.login = login

        args.res$.seneca.cookies.set(options.tokenkey, login.id, options.cookies)

        done(null, {ok: true, user: user, login: login})
      }
      else return done(null, {ok: false})
    }
  }
}

// default service login trigger
Access._triggerServiceLogin = function(seneca) {
  var userent = seneca.make$('sys/user')
  var useract = seneca.pin({role: 'user', cmd: '*'})

  return function( args, done ) {
    var q = {}
    if( args.identifier ) {
      q[args.service + '_id'] = args.identifier
    } else {
      var err = new Error('no identifier')
      err.code = 'no_identifier'
      return done(err, undefined)
    }

    userent.load$(q, function(err, user) {

      if(err) {
        seneca.log.error(err)
        return done(err, undefined)
      }

      var props = {
        nick: args.nick,
        email: args.email,
        name: args.name,
        active: true,
        service: {}
      }
      props[args.service + 'Id'] = args.identifier

      props.service[args.service] = {
        credentials: args.credentials,
        userdata: args.userdata,
        when: args.when
      }


      if( !user ) {
        useract.register( props, function(err, out) {
          done(err, out ? out.user : undefined)
        })
      } else {
        user.data$( seneca.util.deepextend( user.data$(), props ) )
        user.save$( done )
      }
    })
  }
}

Access._wrapUser = function(seneca) {

  var userent = seneca.make$('sys/user')

  return function( args, done ) {
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

}




module.exports = Access
