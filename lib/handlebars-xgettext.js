var fs = require('fs'),
  path = require('path'),
  readdirp = require('readdirp'),
  Parser = require('./parser'),
  gt = require("gettext-parser");

/**
 * Parse input and save the i18n strings to a PO file.
 *
 * @param Array Files to parse
 * @param Object Options
 * @param Function Callback (optional)
 */
function parse(files, options, callback) {
  options = options || {};

  if (!files && !options.directory && !options['files-from']) {
    throw 'No input specified';
  }

  if (typeof files === 'string') {
    files = [files];
  }

  options['from-code'] = options['from-code'] || 'utf8';
  options['force-po'] = options['force-po'] || false;

  // Decode the xgettext-style keyword options.
  options.keyword = [].concat(options.keyword); // coerce to array

  options.keyword = options.keyword.reduce(function(result, keywordspec) {
    var parts = keywordspec.split(':'), // ['gettext', '1,2,3c']
        key = parts[0], // 'gettext'
        argnums = parts[1], // '1,2,3c'
        first = 0;

    argnums = argnums ? argnums.split(',') : ['1']; // 'xgettext' === 'xgettext:1'

    result[key] = argnums.reduce(function(ret, argnum) {
      var match;

      if ((match = argnum.match(/(\d)c/))) {
        ret[match[1]] = 'context';
      } else {
        if (isNaN(argnum)) { //attribute name
          ret[argnum] = true;
        } else { //number
          ret[argnum] = first++ ? "plural" : "singular";
        }
      }
      return ret;
    }, {});
    return result;
  }, {});

  var context = {},
    po;

  function parseFiles (files) {
    var parser = new Parser(options.keyword),
      strings,
      template,
      relativePath;

    function addPath (path) {
      return function addLine (line) {
        return path + ':' + line;
      };
    }

    files.forEach(function (file) {
      template = fs.readFileSync(path.resolve(file), options['from-code']);
      relativePath = file.split(path.sep).join('/');
      strings = parser.parse(template);

      for (var msgid in strings) {
        if (strings.hasOwnProperty(msgid)) {
          context[msgid] = context[msgid] || {msgid: msgid, comments: {}};

          if (strings[msgid].plural) {
            context[msgid].msgid_plural = context[msgid].msgid_plural || strings[msgid].plural;
            context[msgid].msgstr = ['', ''];
          }

          if (!options['no-location']) {
            context[msgid].comments.reference = (context[msgid].comments.reference || '')
              .split('\n')
              .concat(strings[msgid].line.map(addPath(relativePath)))
              .join('\n')
              .trim('\n');
          }
        }
      }
    });
  }

  function output () {
    if (callback) {
      if (Object.keys(context).length > 0 || options['force-po']) {
        po = gt.po.compile({
          charset: options['from-code'],
          translations: {
            '': context
          }
        });

        if (options.output) {
          fs.writeFileSync(options.output, po);
        }
      }
      callback(po);
    }
  }

  if (options.directory) {
    readdirp({root: options.directory}, function(err, res) {
      if (err) {
        throw err;
      }

      parseFiles(res.files.map(function (file) {
        return file.fullPath;
      }));

      output();
    });
  } else {
    if (files) {
      parseFiles(files);
    }
    output();
  }
}

module.exports = parse;
