"use strict";


var assert     = require('assert')
var connect    = require('connect')
var bodyParser = require('body-parser')
var request    = require('request')

var seneca = require('seneca')



describe('auth', function() {
  var si, tmp = {}


  before(function(fin){
    si = seneca({log:'silent'})
      .use('user')
      .use('..')
      .ready(function(){
        var app = connect()
        app.use( bodyParser.json() )
        app.use( this.export('web') )
        app.listen(8888)
        fin()
      })
  })

  
  it('route-user-none', function(fin){
    si.act('role:auth,route:user',function(err,out){
      if( err ) return fin(err);
      assert.ok(out.ok)
      fin()
    })
  })


  it('route-register-ru1', function(fin){
    si.options({errhandler:fin})
    si
      .delegate({      
        req$: make_req(),
        res$: make_res()
      })
      .act(
        'role:auth,route:register',
        {data:{nick:'ru1'}},
        function(err,out){
          if( err ) return fin(err);
          assert.ok(out.ok)
          assert.ok(out.login)
          assert.equal('ru1',out.user.nick)
          tmp.ru1 = out.user
          fin()
        })
  })


  it('route-user-ru1-id', function(fin){
    si.act('actid$:route-user-ru1-id,role:auth,route:user,user:"'+tmp.ru1.id+'"',
           function(err,out){
             if( err ) return fin(err);
             assert.ok(out.ok)
             assert.equal(out.user.id,tmp.ru1.id)
             //console.log(out)
             fin()
           })
  })


  it('http-user', function(fin) {
    request({url:'http://localhost:8888/auth/user',json:true},function(err,res,body){
      if(err) return fin(err);
      assert.ok(body.ok)
      fin()
    })
  })

})


function make_req() {
  return {
    seneca:{},
    headers:{},
    connection:{},
  }
}

function make_res() {
  return {
    seneca:{},
    getHeader: function(){},
    setHeader: function(){},
  }
}
