module.exports = function () {
  var seneca = this

  function do_respond (msg, next) {
    var err = msg.err
    var action = msg.action
    var req = msg.req
    var forceStatus = msg.forceStatus
    var forceRedirect = msg.forceRedirect

    req.seneca.act("role: 'auth', cmd: 'redirect'", {kind: action}, function (errRedirect, redirect) {
      if (err) {
        if (redirect) {
          req.seneca.log.debug('redirect', 'fail', redirect.fail)
          return next(null, {http$: {status: forceStatus || 301, redirect: forceRedirect || redirect.fail}})
        }

        return next(null, {http$: {status: forceStatus || 200, redirect: forceRedirect}, ok: false, why: err})
      }

      seneca.act("role:'auth', cmd:'clean'", {user: req.seneca.user, login: req.seneca.login}, function (err, out) {
        if (err) {
          req.seneca.log.error('error ', err)
          return next({http$: {status: 500}})
        }

        out.ok = true
        out.http$ = {status: forceStatus || 200, redirect: forceRedirect}

        if (redirect) {
          req.seneca.log.debug('redirect', 'win', redirect.win)
          out.http$ = {status: forceStatus || 301, redirect: forceRedirect || redirect.win}
        }
        return next(null, out)
      })
    })
  }

  seneca.add({role: 'auth', do: 'respond'}, do_respond)

  return {
    name: 'auth-common'
  }
}
