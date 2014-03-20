
var _     = require('underscore')
var Http  = require('../HttpCode.js')

function restrictAuthOnly(options) {

  return function(req, res, next) {

    if( _.isFunction(options.restrict) ) {

      options.restrict(req, res, next)

    } else {
      var restrictFilter = new RequestFilter(options.restrict)

      if(restrictFilter.match(req) && !(req.seneca && req.seneca.user) ) {

        var redirect = false
        var ct = (req.headers['content-type'] || '').split(';')[0]

        if( 'application/json' == ct ) {
          redirect = false
        } else {
          redirect = true
        }

        if( redirect ) {
          sendredirect( Http.FOUND, res, options.redirect.restrict )
        } else {
          res.writeHead(Http.UNAUTHORIZED)
          res.end( JSON.stringify({ok: false, why: 'restricted'}) )
        }
      } else {
        next()
      }
    }
  }
}

module.exports = restrictAuthOnly
