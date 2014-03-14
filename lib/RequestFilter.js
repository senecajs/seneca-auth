var _ = require('underscore')

function RequestFilter(match) {
  this._checks = this._urlMatcher(match)
}


RequestFilter.prototype._urlMatcher = function( spec ) {
  spec = _.isArray(spec) ? spec : [spec]
  var checks = []

  _.each(spec, function(path) {
    if( _.isFunction(path) ) return checks.push(path)
    if( _.isRegExp(path) ) return checks.push( function(req) { return path.test(req.url) } )
    if( !_.isString(path) ) return

    path = ~path.indexOf(':') ? path : 'prefix:' + path
    var parts = path.split(':')
    var kind  = parts[0]
    var spec  = parts.slice(1)

    function regex() {
      var pat = spec, mod = '', re
      var m = /^\/(.*)\/([^\/]*)$/.exec(spec)
      if(m) {
        pat = m[1]
        mod = m[2]
        re = new RegExp(pat, mod)
        return function(req) {return re.test(req.url)}
      } else {
        return function() {return false}
      }
    }

    var pass = {
      prefix:   function(req) { return gex(spec + '*').on(req.url) },
      suffix:   function(req) { return gex('*' + spec).on(req.url) },
      contains: function(req) { return gex('*' + spec + '*').on(req.url) },
      gex:      function(req) { return gex(spec).on(req.url) },
      exact:    function(req) { return spec === req.url },
      regex:    regex()
    }
    pass.re = pass.regexp = pass.regex
    checks.push(pass[kind])
  })

  return checks
}

RequestFilter.prototype.match = function(req) {
    for( var i = 0; i < req._checks.length; i++ ) {
      if( req._checks[i](req) ) return true
    }
    return false
}

module.exports = RequestFilter
