
var connect       = require('connect')
var RequestFilter = require('../RequestFilter.js')

function serveStaticFiles(options) {
  var contentFolder = require('path').normalize(__dirname + '/../../web')
  var staticRequestHandler = connect.static(contentFolder)
  var contentFilter = new RequestFilter(options.content)

  return function(req, res, next) {
    console.log('static', req.url)
    if( contentFilter.match(req) ) {
      console.log('static', true)
      req.url = req.url.substring(options.prefix.length)
      return staticRequestHandler( req, res )
    }

    if( options.defaultpages ) {
      var loginpage = _.reduce(options.loginpages, function(found, loginpage) {
        if( found ) return found
        if( req.url == loginpage.path ) return loginpage
      }, null)

      if( loginpage ) {
        console.log('static login', true)
        req.url = '/login.html'
        return staticRequestHandler( req, res )
      }
    }

    next()

  }
}

module.exports = serveStaticFiles
