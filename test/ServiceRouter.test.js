
var ServiceRouter = require('../lib/ServiceRouter.js')


describe('ServiceRouter', function() {

  var passportMock
  var senecaMock


  before(function() {
    passportMock = {
      initialize: function() {
        return function(req, res, next) {
          setImmediate(next())
        }
      }
    }
    senecaMock = {
      add: function() {}
    }
  })

  it('initialize', function() {

    var options = {
      urlpath: {
        login: '/'
      }
    }


    new ServiceRouter(options, senecaMock, {}, passportMock)
  })


})
