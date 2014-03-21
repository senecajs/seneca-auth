

function senecaSession(seneca, options) {
  return function(req, res, next) {

    var token = req.seneca.cookies.get(options.tokenkey)

    if( token ) {
      seneca.act({role: 'user', cmd: 'auth', token: token}, seneca.err(next, function(out) {

        if( out.ok ) {
          req.user = {user: out.user, login: out.login}
          req.seneca.user = out.user
          req.seneca.login = out.login

          adminLocal(options, req, req.seneca.user)

          next()

        } else {

          // dead login - get rid of the cookie
          res.seneca.cookies.set( options.tokenkey )
          next()

        }
      }))
    } else {
      next()
    }
  }
}

// TODO: understand why this exists and then get rid of it
function adminLocal(options, req, user) {

  if( options.admin.local
    && ( '127.0.0.1' === req.connection.remoteAddress ||
    '::1' === req.connection.remoteAddress ) )
  {
    user.admin = true
  }
}

module.exports = senecaSession
