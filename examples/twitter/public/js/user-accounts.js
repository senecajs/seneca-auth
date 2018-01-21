/*global $:false*/

$(function () {
  var orig_nick
  $('#login').submit(function () {
    var data = {
      username: $('#login_username').val(),
      password: $('#login_password').val()
    }
    $.post('/auth/login', data, function (instance) {
      cleanMessages()
      if (!instance.ok) {
        $('#errorMsg').text('Error: ' + instance.why)
        return
      }
      showAccount(instance)
    })
    return false
  })

  $('#register_form').submit(function () {
    var data = {
      email: $('#email').val(),
      password: $('#password').val(),
      repeat: $('#repeat').val(),
      name: $('#name').val()
    }
    $.post('/auth/register', data, function (instance) {
      cleanMessages()
      if (!instance.ok) {
        $('#errorMsg').text('Error: ' + instance.why)
        return
      }
      else {
        $('#msg').text('User registered successfully.')
      }
      showAccount(instance)
    })
    return false
  })

  $('#update_form').submit(function () {
    var data = {
      orig_nick: orig_nick,
      email: $('#user_email').val(),
      name: $('#user_name').val()
    }
    $.post('/auth/update_user', data, function (instance) {
      cleanMessages()
      if (!instance.ok) {
        $('#errorMsg').text('Error: ' + instance.why)
        return
      }
      else {
        $('#msg').text('User updated successfully.')
      }
      showAccount(instance)
    })
    return false
  })

  $('#logout').click(function () {
    cleanMessages()
    $.post('/auth/logout', {}, function (instance) {
      cleanMessages()
      $('#msg').text('Logout successfully.')
      showLogin(instance)
    })
  })

  $.get('/auth/user', showAccount)

  $('#show_login').click(showLogin)

  $('#show_register').click(showRegister)

  function cleanMessages () {
    $('#errorMsg').text('')
    $('#msg').text('')
  }

  function showRegister () {
    $('#content_login').slideUp()
    $('#content_register').slideDown()
    $('#content_account').slideUp()
  }

  function showAccount (instance) {
    if (instance.user) {
      orig_nick = instance.user.nick
      $('#user_name').val(instance.user.name)
      $('#user_email').val(instance.user.email)

      $('#content_login').slideUp()
      $('#content_register').slideUp()
      $('#content_account').slideDown()
    }
    else {
      showLogin()
    }
  }

  function showLogin () {
    $('#content_login').slideDown()
    $('#content_register').slideUp()
    $('#content_account').slideUp()
  }
})
