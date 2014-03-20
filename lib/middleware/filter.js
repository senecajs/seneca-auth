

function filter(options, middlewares) {
  var excludeFilter = new RequestFilter(options.exclude)
  var includeFilter = new RequestFilter(options.include)

  return function(req, res, next) {


    if( excludeFilter.match(req) && !includeFilter.match(req) ) {
      next()
    } else {
      middlewares.execute(req, res, next)
    }
  }

}


module.exports = filter
