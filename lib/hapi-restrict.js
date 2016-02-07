var _ = require('lodash')

function Restrict (options, seneca) {
  this.options = options
  this.seneca = seneca

  this.internals = {}
  var that = this

  this.internals.checkurl = function (match, done) {
    that.seneca.act("role:'auth',cmd: 'urlmatcher'", {spec: match}, function (err, checks) {
      if (err) return done(err)

      return done(null, function (req) {
        for (var i = 0; i < checks.length; i++) {
          if (checks[i]({url: req.path})) {
            return true
          }
        }
        return false
      })
    })
  }

  this.internals.checkurl(options.exclude, function (err, response) {
    if (err) return

    that.internals.exclude_url = response
  })

  this.internals.checkurl(options.include, function (err, response) {
    if (err) return

    that.internals.include_url = response
  })

  if (!_.isFunction(options.restrict)) {
    that.seneca.act("role:'auth', cmd: 'urlmatcher'", {spec: options.restrict}, function (err, result) {
      if (!err) {
        that.internals.checks = result
      }
    })
  }
}

Restrict.prototype.restriction = function () {
  var that = this
  if (_.isFunction(that.options.restrict)) return that.options.restrict

  return function (path) {
    for (var cI = 0; cI < that.internals.checks.length; cI++) {
      var restrict = that.internals.checks[cI]({url: path})
      if (restrict) {
        return true
      }
    }
    return false
  }
}

module.exports = Restrict
