
var connect = require('connect')

function serveStaticFiles(options) {
  var contentFolder = require('path').normalize(__dirname + '/../../web')
  var staticRequestHandler = connect.static(contentFolder)
  var contentFilter = new RequestFilter(options.content)

  return function(req, res, next) {

    if( contentFilter.match(req) ) {
      req.url = req.url.substring(options.prefix.length)
      return staticRequestHandler( req, res )
    }

    if( options.defaultpages ) {
      var loginpage = _.reduce(options.loginpages, function(found, loginpage) {
        if( found ) return found
        if( req.url == loginpage.path ) return loginpage
      }, null)

      if( loginpage ) {
        req.url = '/login.html'
        return staticRequestHandler( req, res )
      }
    }

    next()

  }
}

module.exports = serveStaticFiles
