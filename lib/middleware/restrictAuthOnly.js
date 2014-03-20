
var _             = require('underscore')
var Http          = require('../HttpCode.js')
var RequestFilter = require('../RequestFilter.js')

function restrictAuthOnly(options) {

  return function(req, res, next) {
    console.log('restrictAuthOnly', req.url)
    if( _.isFunction(options.restrict) ) {

      console.log('restrictAuthOnly func', true)
      options.restrict(req, res, function(err) {
        next(err)
      })

    } else {
      var restrictFilter = new RequestFilter(options.restrict)

      if(restrictFilter.match(req) && !(req.seneca && req.seneca.user) ) {
        console.log('restrictAuthOnly match', true)
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
        console.log('restrictAuthOnly match', false)
        next()
      }
    }
  }
}

module.exports = restrictAuthOnly
