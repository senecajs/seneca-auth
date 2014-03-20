
var Cookies = require('cookies')

function filter() {

  return function(req, res, next) {

    console.log('cookies', req.url)
    req.seneca.cookies = new Cookies(req, res)
    next()
  }

}


module.exports = filter
