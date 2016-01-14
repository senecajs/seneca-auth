
module.exports = function () {
  var seneca = this

  function do_respond (msg, next) {
    var err = msg.err
    var action = msg.action
    var req = msg.req
    var forceStatus = msg.forceStatus
    var forceRedirect = msg.forceRedirect

    if (err){
      return next(null, {ok: false, why: err})
    }

    seneca.act("role:'auth', cmd:'clean'", {user: req.seneca.user, login: req.seneca.login}, function (err, out) {
      if (err) {
        return next(err)
      }

      out.ok = true
      return next(null, out)
    })
  }

  seneca.add({role: 'auth', do: 'respond'}, do_respond)
}
