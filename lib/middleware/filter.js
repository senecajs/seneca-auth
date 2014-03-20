
var RequestFilter = require('../RequestFilter.js')

function filter(options, middlewares) {
  var excludeFilter = new RequestFilter(options.exclude)
  var includeFilter = new RequestFilter(options.include)

  return function(req, res, next) {

    console.log('filter', req.url)

    if( excludeFilter.match(req) && !includeFilter.match(req) ) {
      console.log('filter', true)
      next()
    } else {
      console.log('filter dive', true)
      middlewares.execute(req, res, next)
    }
  }

}


module.exports = filter
