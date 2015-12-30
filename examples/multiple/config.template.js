module.exports = {
  main: {
    port: 3000
  },
  'twitter': {
    'apiKey': 'TWITTER_KEY',
    'apiSecret': 'TWITTER_SECRET',
    'urlhost': 'http://localhost:3000'
  },
  'facebook': {
    'appId': 'APP_ID',
    'appSecret': 'APP_SECRET',
    'urlhost': 'http://localhost:3333',
    'serviceParams': {
      'scope': [
        'email'
      ]
    }
  },
  'google': {
    'clientID': 'CLIENT_ID',
    'clientSecret': 'CLIENT_SECRET',
    'urlhost': 'http://localhost:3333'
  },
  'github': {
    'clientID': 'CLIENT_ID',
    'clientSecret': 'CLIENT_SECRET',
    'urlhost': 'http://localhost:3333'
  }
}
