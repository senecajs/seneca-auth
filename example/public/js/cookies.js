'use strict';

/**
 * A complete cookies reader/writer Angular Module with full unicode support
 *
 * ### Original Source - A little framework: a complete cookies reader/writer with full unicode support
 *
 * https://developer.mozilla.org/en-US/docs/DOM/document.cookie
 *
 * ### Syntax
 *
 * Cookies.setItem(name, value[, end[, path[, domain[, secure]]]])
 * Cookies.getItem(name)
 * Cookies.removeItem(name[, path])
 * Cookies.hasItem(name)
 * Cookies.keys()
 *
 * @date 2013-08-02
 * @version 0.0.1
 *
 * ### Notes
 *
 * - This framework is released under the GNU Public License, version 3 or later. http://www.gnu.org/licenses/gpl-3.0-standalone.html
 *
 */

/**
 * Setup the cookiesModule.
 */
var cookiesModule = angular.module('cookiesModule', []);

/**
 * Set date value for infinity parameter
 */
cookiesModule.constant('infinity_date', 'Fri, 31 Dec 9999 23:59:59 GMT');

cookiesModule.factory('Cookies', ['infinity_date' ,function (infinity_date) {

  return {

    /**
     * Read a cookie. If the cookie doesn't exist a null value will be returned.
     *
     * ### Syntax
     *
     * Cookies.getItem(name)
     *
     * ### Example usage
     *
     * Cookies.getItem('test1');
     * Cookies.getItem('test5');
     * Cookies.getItem('test1');
     * Cookies.getItem('test5');
     * Cookies.getItem('unexistingCookie');
     * Cookies.getItem();
     *
     * ### Parameters
     *
     * @param sKey - name - the name of the cookie to read (string).
     * @returns {string|null}
     */

    getItem: function (sKey) {
      return decodeURI(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURI(sKey).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
    },

    /**
     * Create/overwrite a cookie.
     *
     * ### Syntax
     *
     *  Cookies.setItem(name, value[, end[, path[, domain[, secure]]]])
     *
     * ### Example usage
     *
     * Cookies.setItem('test0', 'Hello world!');
     * Cookies.setItem('test1', 'Unicode test: \u00E0\u00E8\u00EC\u00F2\u00F9', Infinity);
     * Cookies.setItem('test2', 'Hello world!', new Date(2020, 5, 12));
     * Cookies.setItem('test3', 'Hello world!', new Date(2027, 2, 3), '/blog');
     * Cookies.setItem('test4', 'Hello world!', 'Sun, 06 Nov 2022 21:43:15 GMT');
     * Cookies.setItem('test5', 'Hello world!', 'Tue, 06 Dec 2022 13:11:07 GMT', '/home');
     * Cookies.setItem('test6', 'Hello world!', 150);
     * Cookies.setItem('test7', 'Hello world!', 245, '/content');
     * Cookies.setItem('test8', 'Hello world!', null, null, 'example.com');
     * Cookies.setItem('test9', 'Hello world!', null, null, null, true);
     *
     * ### Notes
     *
     * For never-expire-cookies we used the arbitrarily distant date Fri, 31 Dec 9999 23:59:59 GMT. If for any reason you are afraid of such a date, use the conventional date of end of the world Tue, 19 Jan 2038 03:14:07 GMT – which is the maximum number of seconds elapsed since since 1 January 1970 00:00:00 UTC expressible by a signed 32-bit integer (i.e.: 01111111111111111111111111111111, which is new Date(0x7fffffff * 1e3)).
     *
     * ### Parameters
     *
     * @param sKey - name (required) - The name of the cookie to create/overwrite (string).
     * @param sValue - value (required) - The value of the cookie (string).
     * @param vEnd - end (optional) - The max-age in seconds (e.g. 31536e3 for a year, Infinity for a never-expires cookie) or the expires date in GMTString format or as Date object; if not specified it will expire at the end of session (number – finite or Infinity – string, Date object or null).
     * @param sPath - path (optional) - E.g., "/", "/mydir"; if not specified, defaults to the current path of the current document location (string or null).
     * @param sDomain - domain (optional) - E.g., "example.com", ".example.com" (includes all subdomains) or "subdomain.example.com"; if not specified, defaults to the host portion of the current document location (string or null).
     * @param bSecure - secure (optional) - The cookie will be transmitted only over secure protocol as https (boolean or null).
     * @returns {boolean}
     */

    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
      if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
      var sExpires = '';
      if (vEnd) {
        switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? '; expires=' + infinity_date : '; max-age=' + vEnd;
          break;
        case String:
          sExpires = '; expires=' + vEnd;
          break;
        case Date:
          sExpires = '; expires=' + vEnd.toGMTString();
          break;
        }
      }
      document.cookie = encodeURI(sKey) + '=' + encodeURI(sValue) + sExpires + (sDomain ? '; domain=' + sDomain : '') + (sPath ? '; path=' + sPath : '') + (bSecure ? '; secure' : '');
      return true;
    },

    /**
     * Delete a cookie
     *
     * ### Syntax
     *
     * Cookies.removeItem(name[, path])
     *
     * ### Example usage
     *
     * Cookies.removeItem('test1');
     * Cookies.removeItem('test5', '/home');
     *
     * ### Parameters
     *
     * @param sKey - name - the name of the cookie to remove (string).
     * @param sPath - path (optional) - e.g., "/", "/mydir"; if not specified, defaults to the current path of the current document location (string or null).
     * @returns {boolean}
     */

    removeItem: function (sKey, sPath) {
      if (!sKey || !this.hasItem(sKey)) { return false; }
      document.cookie = encodeURI(sKey) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' + (sPath ? '; path=' + sPath : '');
      return true;
    },

    /**
     * Check if a cookie exists.
     *
     * ### Syntax
     *
     * Cookies.hasItem(name)
     *
     * ### Parameters
     *
     * @param sKey - name - the name of the cookie to test (string).
     * @returns {*}
     */

    hasItem: function (sKey) {
      return (new RegExp('(?:^|;\\s*)' + encodeURI(sKey).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=')).test(document.cookie);
    },

    /**
     * Returns an array of all readable cookies from this location.
     *
     * ### Example usage
     *
     * Cookies.keys().join('\n');
     *
     * @returns {*}
     */

    keys: /* optional method: you can safely remove it! */ function () {
      var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, '').split(/\s*(?:\=[^;]*)?;\s*/);
      for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURI(aKeys[nIdx]); }
      return aKeys;
    }

  };

}]);
