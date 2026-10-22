function handler(event) {
  var request = event.request;
  var pages = ['/', '/news', '/transit', '/calendar', '/login', '/signup', '/my', '/settings', '/onboarding', '/explore'];
  var uri = request.uri.length > 1 ? request.uri.replace(/\/$/, '') : request.uri;
  if (pages.indexOf(uri) !== -1) request.uri = '/index.html';
  return request;
}
