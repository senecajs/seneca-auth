
var _             = require('underscore')
var Http          = require('../HttpCode.js')
var RequestFilter = require('../RequestFilter.js')

function restrictAuthOnly(options) {

  return function(req, res, next) {
    if( _.isFunction(options.restrict) ) {

      options.restrict(req, res, function(err) {
        next(err)
      })

    } else {
      var restrictFilter = new RequestFilter(options.restrict)

      if(restrictFilter.match(req) && !(req.seneca && req.seneca.user) ) {

        var redirect = false
        var acceptRequestHeaders = (req.headers['accept'] || '').split(';')[0]
        
        if( 'application/json' == acceptRequestHeaders ) {
          redirect = false
        } else {
          redirect = true
        }

        if( redirect ) {
          res.writeHead(Http.FOUND, {Location: options.redirect.restrict})
          res.end()
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
