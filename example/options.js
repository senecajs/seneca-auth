

module.exports = {

  main: {
    port: 3000
  },

  auth: {
    // change to true if you want to send emails
    sendemail:false
  },

  settings: {
    spec: {
      a:{"type":"text", "nice":"A", "help":"Example of text."},
      b:{"type":"email", "nice":"B", "help":"Example of email."},
      c:{"type":"tel", "nice":"C", "help":"Example of tel."},
      d:{"type":"number", "nice":"D", "help":"Example of number."},
      e:{"type":"time", "nice":"E", "help":"Example of time."},
      f:{"type":"date", "nice":"F", "help":"Example of date."},
      g:{"type":"datetime", "nice":"G", "help":"Example of datetime."},
      h:{"type":"color", "nice":"H", "help":"Example of color."},
      i:{"type":"url", "nice":"I", "help":"Example of url."},
      j:{"type":"checkbox", "nice":"J", "help":"Example of checkbox."},
      k:{"type":"range", "nice":"K", "help":"Example of range.", "default" : 50},
      l:{"type":"rating", "nice":"L", "help":"Example of rating.", "stars" : 6 },
      ll:{"type":"rating", "nice":"LL", "help":"Example of rating."},
      m:{"type":"yesno", "nice":"M", "help":"Example of yesno."},
      n:{"type":"onoff", "nice":"N", "help":"Example of onoff slider.", "default" : 0},
      o:{"type":"buttons", "nice":"O", "help":"Example of buttons.", "options" : ["foo", "bar", "baz"]},
      p:{"type":"dropdown", "nice":"P", "help":"Example of dropdown.", "options" : ["foo", "bar", "baz"]},
      q:{"type":"dropdownplus", "nice":"Q", "help":"Example of dropdownplus.", "options" : ["foo", "bar", "baz"]},
      r:{"type":"longtext", "nice":"R", "help":"Example of longtext."},
      s:{"type":"radio", "nice":"S", "help":"Example of radio.", "options" : ["foo", "bar", "baz"]},
    }
  }

}
