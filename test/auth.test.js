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
    si = si
      .delegate({      
        req$: make_req(),
        res$: make_res()
      })
    si.fixedargs.req$.seneca = si
    si.fixedargs.res$.seneca = si

    si.act(
        'role:auth,route:register',
        {data:{nick:'ru1',password:'ru1p'}},
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
             fin()
           })
  })


  it('route-login-ru1', function(fin){
    si.options({errhandler:fin})
    si = si
      .delegate({      
        req$: make_req({
          username:'ru1',
          password:'ru1p'
        }),
        res$: make_res()
      })
    si.fixedargs.req$.seneca = si
    si.fixedargs.res$.seneca = si

    si.act('actid$:login-ru1,role:auth,route:login',
           function(err,out){
             if( err ) return fin(err);

             assert.ok(out.ok)
             assert.equal('password',out.why)
             assert.ok(out.user)
             assert.ok(out.login)
             assert.ok(si.fixedargs.res$._headers['Set-Cookie'])
             fin()
           })
  })


  it('http-user', function(fin) {
    request({url:'http://localhost:8888/auth/user',json:true},function(err,res,body){
      if(err) return fin(err);
      assert.ok(body.ok)
      assert.ok(!body.user)
      assert.ok(!body.login)
      fin()
    })
  })


  it('http-login', function(fin) {
    request(
      {
        url:'http://localhost:8888/auth/login',
        body:{username:'ru1',password:'ru1p'},
        json:true
      },
      function(err,res,body){
        if(err) return fin(err);
        assert.ok(body.ok)
        assert.ok(body.user)
        assert.ok(body.login)
        assert.ok(res.headers['set-cookie'])
        fin()
      })
  })

  it('http-login-local-strategy', function(fin) {
    request(
      {
        url:'http://localhost:8888/auth/login/local',
        body:{username:'ru1',password:'ru1p'},
        json:true
      },
      function(err,res,body){
        if(err) return fin(err);
        assert.ok(body.ok)
        assert.ok(body.user)
        assert.ok(body.login)
        assert.ok(res.headers['set-cookie'])
        fin()
      })
  })

})


function make_req(body) {
  return {
    headers:{},
    connection:{},
    body:body
  }
}

function make_res() {
  return {
    _headers: {},
    getHeader: function(h){ return this._headers[h] },
    setHeader: function(h,v){ this._headers[h]=v },
  }
}
