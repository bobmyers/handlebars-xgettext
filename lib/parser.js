var newline = /\r?\n|\r/g,
  escapeRegExp = function (string) {
      // source: https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
      return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    };

/**
 * Constructor
 */
function Parser(keywords, attr_keywords) {
  if (!keywords) {
    keywords = ['gettext', '_'];
  }

  if (typeof keywords === 'string') {
    keywords = [keywords];
  }

  this.keywords = keywords;

  this.pattern = new RegExp([
    '\\{\\s*\\{',
    '(?:' + keywords.map(escapeRegExp).join('|') + ') ',
    '[\'"]((?:\\\\.|[^\'"\\\\])*)[\'"]',
    '(?: [\'"]((?:\\\\.|[^\'"\\\\])*)[\'"] \\w+)? ?',
    '.*?', // skip other params if any
    '\\}\\s*\\}'
    ].join(''), 'gm');

  this.attr_pattern = new RegExp([
    '\\{\\s*\\{',
    '(?:' + attr_keywords.map(escapeRegExp).join('|') + ')\\s*',
    '(.*)',
    '\\}\\s*\\}'

  ].join(''), 'gm');
}

/**
 * Given a Handlebars template string returns the list of i18n strings.
 *
 * @param String template The content of a HBS template.
 * @return Object The list of translatable strings, the line(s) on which each appears and an optional plural form.
 */
Parser.prototype.parse = function (template) {
  var result = {},
    match,
    attr_match;

  function add(msgid, msgid_plural) {
    var msg = result[msgid] = result[msgid] || {};
    if (msgid_plural) {
      msg.plural = msg.plural || msgid_plural;
    }
    msg.line = msg.line || [];
    msg.line.push(template.substr(0, match.index).split(newline).length);
  }

  while ((match = this.pattern.exec(template)) !== null) {
    add(match[1], match[2]);
  }

  while ((match = this.attr_pattern.exec(template)) !== null) {
    match[1].replace(/\b\w+\s*=\s*('[^']*?'|"[^"]*?")/, function(att, val) {
      add(val.replace(/^.|.$/g, ""));
    });
  }

  return result;
};

module.exports = Parser;
