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

  $('#execute_reset').click(function () {
    var data = {
      token: $('#reset_token').val(),
      password: $('#new_password').val()
    }
    $.post('/auth/execute_reset', data, function (instance) {
      cleanMessages()
      if (!instance.ok) {
        $('#errorMsg').text('Error: ' + instance.why)
        return
      }
      else {
        $('#msg').text('Password updated successfully.')
      }
      showLogin()
    })
    return false
  })

  $('#load_reset').click(function () {
    var data = {
      token: $('#reset_token').val()
    }
    $.post('/auth/load_reset', data, function (instance) {
      cleanMessages()
      if (!instance.ok) {
        $('#errorMsg').text('Error: ' + instance.why)
        return
      }
      else {
        $('#msg').text('Reset token ' + (instance.active ? 'active' : 'not active') + '. User: ' + instance.nick)
      }
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

  $('#create_reset').click(function () {
    cleanMessages()
    $.post('/auth/create_reset', {nick: $('#login_username').val()}, function (instance) {
      cleanMessages()
      if (!instance) {
        $('#errorMsg').text('Reset password token error. Reason: Unknown reason')
        return
      }
      if (instance.ok) {
        $('#msg').text('Reset password token created successfully. The token should be sent on owner e-mail. For simplicity we are displaying the token here: ' + instance.reset.id)
        showReset()
      }
      else {
        $('#errorMsg').text('Reset password token error. Reason: ' + (instance.why || 'Unknown reason'))
      }
    })
  })

  $.get('/auth/user', showAccount)

  $('#show_login').click(showLogin)
  $('#show_register').click(showRegister)
  $('#show_account').click(showAccount)

  function cleanMessages () {
    $('#errorMsg').text('')
    $('#msg').text('')
  }

  function showRegister () {
    $('#content_register').slideDown()
    $('#content_login').slideUp()
    $('#content_reset').slideUp()
    $('#content_account').slideUp()
  }

  function showReset () {
    $('#content_reset').slideDown()
    $('#content_login').slideUp()
    $('#content_register').slideUp()
    $('#content_account').slideUp()
  }

  function showAccount (instance) {
    if (instance.user) {
      orig_nick = instance.user.nick
      $('#user_name').val(instance.user.name)
      $('#user_email').val(instance.user.email)

      $('#content_account').slideDown()
      $('#content_login').slideUp()
      $('#content_register').slideUp()
      $('#content_reset').slideUp()
    }
    else {
      showLogin()
    }
  }

  function showLogin () {
    $('#content_login').slideDown()
    $('#content_reset').slideUp()
    $('#content_register').slideUp()
    $('#content_account').slideUp()
  }
})
