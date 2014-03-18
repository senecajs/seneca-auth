
var ServiceRouter = require('../lib/ServiceRouter.js')


describe('ServiceRouter', function() {

  var passportMock


  before(function() {
    passportMock = {
      initialize: function() {
        return function(req, res, next) {
          setImmediate(next())
        }
      }
    }
  })

  it('initialize', function() {

    var options = {
      urlpath: {
        login: '/'
      }
    }


    new ServiceRouter(options, {}, {}, passportMock)
  })


})
