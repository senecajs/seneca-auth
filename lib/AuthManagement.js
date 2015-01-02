
var async             = require('async')
var _                 = require('underscore')

var AuthManagement = {}

AuthManagement.register = function(plugin, seneca, options) {

  seneca.add({role: plugin, cmd: 'register'},             this._cmdRegister(seneca, options))
  seneca.add({role: plugin, cmd: 'instance'},             this._cmdInstance(plugin))
  seneca.add({role: plugin, cmd: 'clean'},                this._cmdClean())

  seneca.add({role: plugin, cmd: 'create_reset'},         this._cmdCreateReset(seneca, options))
  seneca.add({role: plugin, cmd: 'load_reset'},           this._cmdLoadReset(seneca))
  seneca.add({role: plugin, cmd: 'execute_reset'},        this._cmdExecuteReset(seneca))
  seneca.add({role: plugin, cmd: 'confirm'},              this._cmdConfirm(seneca))

  seneca.add({role: plugin, cmd: 'update_user'},          this._cmdUpdateUser(seneca, options))
  seneca.add({role: plugin, cmd: 'change_password'},      this._cmdChangePassword(seneca))

}

AuthManagement._cmdRegister = function(seneca, options) {
  var useract = seneca.pin({role: 'user', cmd: '*'})

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

  return function( args, done ) {
    var seneca = this

    var details = aliasfields('register', args.data)
    var req = args.req$
    var res = args.res$

    useract.register(details, function(err, out) {
      if( err || !out.ok ) { return done(err, out) }

      useract.login({nick: out.user.nick, auto: true}, function(err, out) {
        if( err || !out.ok ) { return done(err, out) }

        if( options.sendemail ) {
          var mailact = seneca.pin({role: 'mail', cmd: '*'})
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
            res.seneca.cookies.set(options.tokenkey, req.seneca.login.id, options.cookies)
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
}


AuthManagement._cmdCreateReset = function(seneca, options) {
  var useract = seneca.pin({role: 'user', cmd: '*'})
  return function( args, done ) {
    var seneca = this

    var nick  = args.data.nick || args.data.username
    var email = args.data.email

    var resetArgs = {}

    if( nick )  resetArgs.nick  = nick
    if( email ) resetArgs.email = email

    useract.create_reset( resetArgs, function( err, out ) {
      if( err || !out.ok ) return done(err, out)

      if( options.sendemail ) {
        var mailact = seneca.pin({role: 'mail', cmd: '*'})
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
}



AuthManagement._cmdLoadReset = function(seneca) {
  var useract = seneca.pin({role: 'user', cmd: '*'})
  return function( args, done ) {

    var token = args.data.token

    useract.load_reset( {token: token}, function( err, out ) {
      if( err || !out.ok ) return done(err, out)

      done(null, {
        ok: out.ok,
        nick: out.user.nick
      })
    })
  }
}


AuthManagement._cmdExecuteReset = function(seneca) {
  var useract = seneca.pin({role: 'user', cmd: '*'})
  return function( args, done ) {

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
}


AuthManagement._cmdConfirm = function(seneca) {
  var useract = seneca.pin({role: 'user', cmd: '*'})
  return function( args, done ) {

    var code = args.data.code

    useract.confirm( {code: code}, function( err, out ) {
      if( err || !out.ok ) return done(err, out)

      return done(null, {
        ok: out.ok,
      })
    })
  }
}


AuthManagement._cmdUpdateUser = function(seneca, options) {

  var userent = seneca.make$('sys/user')

  return function( args, done ) {

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
}


AuthManagement._cmdChangePassword = function(seneca) {
  var useract = seneca.pin({role: 'user', cmd: '*'})
  return function( args, done ) {

    var user = args.user

    useract.change_password({user: user, password: args.data.password, repeat: args.data.repeat}, function(err, out) {
      if( err ) return done(err)
      return done(null, out)
    })
  }
}



AuthManagement._cmdInstance = function(plugin) {
  return function( args, done ) {
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
}



AuthManagement._cmdClean = function() {
  return function( args, done ) {
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
}

module.exports = AuthManagement
