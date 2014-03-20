;(function(){
  function noop(){for(var i=0;i<arguments.length;i++)if('function'==typeof(arguments[i]))arguments[i]()}
  function empty(val) { return null == val || 0 == ''+val }

  var account_module = angular.module('account',['ngRoute','cookiesModule','senecaSettingsModule']).
        config(['$routeProvider', function($routeProvider) {
          $routeProvider.
            when('/Projects', {
              tab:'Projects'
            }).
            when('/Settings', {
              tab:'Settings'
            }).
            when('/Account', {
              tab:'Account'
            }).
            otherwise({tab:'Dashboard'})}])

  var msgmap = {
    'unknown': 'Unable to perform your request at this time - please try again later.',
    'user-updated': 'Your user details have been updated.',
    'user-exists-email': 'A user with that email already exists.',
    'user-exists-nick': 'A user with that username already exists.',
    'password-updated': 'Your password has been updated.',
    'org-updated': 'Your organisations details have been updated.',
    'project-updated': 'Project updated.',
  }



  account_module.service('auth', function($http,$window) {
    return {
      instance: function(win,fail){
        $http({method:'GET', url: '/auth/instance', cache:false}).
          success(function(data, status) {
            if( win ) return win(data);
          }).
          error(function(data, status) {
            if( fail ) return fail(data);
          })
      },

      logout: function(win,fail){
        $http({method:'POST', url: '/auth/logout', cache:false}).
          success(function(data, status) {
            if( win ) return win(data);
            return $window.location.href='/'
          }).
          error(function(data, status) {
            if( fail ) return fail(data);
          })
      },

      change_password: function(creds,win,fail){
        $http({method:'POST', url: '/auth/change_password', data:creds, cache:false}).
          success(function(data, status) {
            if( win ) return win(data);
          }).
          error(function(data, status) {
            if( fail ) return fail(data);
          })
      },

      update_user: function(fields,win,fail){
        $http({method:'POST', url: '/auth/update_user', data:fields, cache:false}).
          success(function(data, status) {
            if( win ) return win(data);
          }).
          error(function(data, status) {
            if( fail ) return fail(data);
          })
      },

      update_org: function(fields,win,fail){
        $http({method:'POST', url: '/account/update', data:fields, cache:false}).
          success(function(data, status) {
            if( win ) return win(data);
          }).
          error(function(data, status) {
            if( fail ) return fail(data);
          })
      },
    }
  })


  account_module.service('api', function($http,$window) {
    return {
      // GET if no data
      call: function(path,data,win,fail){
        if( _.isFunction(data) ) {
          win = data
          fail = win
          data = void 0
        }

        var params = {
          method:data?'POST':'GET', 
          url: path, 
          data:data, 
          cache:false}

        $http( params ).
          success(function(out, status) {
            if( win ) return win(out);
          }).
          error(function(out, status) {
            if( fail ) return fail(out);
          })
      }
    }
  })

  account_module.service('pubsub', function() {
    var cache = {};
    return {
      publish: function(topic, args) { 
	cache[topic] && $.each(cache[topic], function() {
	  this.apply(null, args || []);
	});
      },
      
      subscribe: function(topic, callback) {
	if(!cache[topic]) {
	  cache[topic] = [];
	}
	cache[topic].push(callback);
	return [topic, callback]; 
      },
      
      unsubscribe: function(handle) {
	var t = handle[0];
	cache[t] && d.each(cache[t], function(idx){
	  if(this == handle[1]){
	    cache[t].splice(idx, 1);
	  }
	});
      }
    }
  });


  account_module.controller('Main', function($scope, auth, pubsub) {
    //var path = window.location.pathname

    auth.instance(function(out){
      $scope.user = out.user
      $scope.account = out.account
      pubsub.publish('user',[out.user])
      pubsub.publish('account',[out.account])
    })

    pubsub.subscribe('user',function(user){
      $scope.user = user
    })
  })


  account_module.controller('NavBar', function($scope, auth, pubsub) {
    
    $scope.btn_account = function() {
      pubsub.publish('view',['Account'])
    }

    $scope.btn_signout = function() {
      auth.logout()
    }
    
  })


  account_module.controller('Account', function($scope, pubsub, auth) {
    pubsub.subscribe('view',function(view){
      if( 'Account' != view ) return;
    })

    pubsub.subscribe('user',function(user){
      $scope.field_name  = user.name
      $scope.field_email = user.email
    })

    pubsub.subscribe('account',function(account){
      $scope.field_org_name  = account.name
      $scope.field_org_web   = account.web
    })


    function read_user() {
      return {
        name:  $scope.field_name,
        email: $scope.field_email
      }
    }

    function read_pass() {
      return {
        password:  $scope.field_password,
        repeat:    $scope.field_repeat
      }
    }

    function read_org() {
      return {
        name: $scope.field_org_name,
        web:  $scope.field_org_web
      }
    }


    $scope.update_user = function() {
      var data = read_user()
      auth.update_user( 
        data, 
        function( out ){
          $scope.account_msg = msgmap['user-updated']
          pubsub.publish('user',[out.user])
        },
        function( out ){
          $scope.details_msg = msgmap[out.why] || msgmap.unknown          
        }
      )
    }


    $scope.change_pass = function() {
      var data = read_pass()
      auth.change_password( 
        data, 
        function( out ){
          $scope.password_msg = msgmap['password-updated']
        },
        function( out ){
          $scope.password_msg = msgmap[out.why] || msgmap.unknown          
        }
      )
    }


    $scope.update_org = function() {
      var data = read_org()
      auth.update_org( 
        data, 
        function( out ){
          $scope.org_msg = msgmap['org-updated']
          pubsub.publish('account',[out.account])
        },
        function( out ){
          $scope.org_msg = msgmap[out.why] || msgmap.unknown          
        }
      )
    }
  })


  account_module.controller('TabView', function($scope, $route, $location, pubsub) {
    var views = ['Dashboard','Projects','Settings','Account']

    $scope.views = _.filter(views,function(n){return n!='Account'})

    pubsub.subscribe('view',function(name){
      console.log('fired:'+name)

      _.each(views,function(v){
        $scope['show_view_'+v] = (name==v)
      })
      $scope.curtab = name

      $location.path(name)
    })

    $scope.tabview = function( name ){
      pubsub.publish('view',[name])
    }

    $scope.$on(
      "$routeChangeSuccess",
      function(event,route){
        if( route.tab && $scope.curtab != route.tab ) {
          $scope.tabview( route.tab )
        }
      })
  })


  account_module.controller('Projects', function($scope, api, pubsub) {
    $scope.projects = []

    $scope.show_projects_list   = true
    $scope.show_project_details = false


    function load_projects() {
      api.call('/project/user_projects',function(out){
        $scope.projects = out.projects
      })
    }


    $scope.new_project = function(){ $scope.open_project() }

    $scope.open_project = function( projectid ) {
      if( void 0 != projectid ) {
        api.call( '/project/load/'+projectid, function( out ){
          if( out.project ) {
            $scope.show_project(out.project)
          }
        }) 
      }
      else $scope.show_project()
    }

    $scope.show_project = function( project ) {
      $scope.project = (project = project || {})

      $scope.field_name = project.name
      $scope.field_code = project.code

      $scope.show_projects_list   = false
      $scope.show_project_details = true

      $scope.project_msg = null
    }

    $scope.close_project = function() {
      $scope.show_projects_list   = true
      $scope.show_project_details = false
    }

    function read_project() {
      return {
        name: $scope.field_name,
        code: $scope.field_code
      }
    }

    $scope.save_project = function() {
      $scope.project = _.extend($scope.project,read_project())

      api.call( '/project/save', $scope.project, function( out ){
        if( out.project ) {
          $scope.show_project(out.project)
          $scope.project_msg = msgmap['project-updated']
          pubsub.publish('project.added',[out.project])
        }
      }, function( out ){
        $scope.project_msg = msgmap[out.why] || msgmap.unknown          
      })   
    }

    load_projects()

    pubsub.subscribe('project.added',load_projects)
  })

})();


