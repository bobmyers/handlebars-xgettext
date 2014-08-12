var newline = /\r?\n|\r/g,
  escapeRegExp = function (string) {
      // source: https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
      return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    };

/**
 * Constructor
 */
function Parser(keywords, comment) {
  if (!keywords) {
    keywords = { gettext: { 1: 'singular' }, _: { 1 :'singular' } };
  }

  this.keywords = keywords;
  this.comment = comment;

  this.pattern = new RegExp([
    '\\{\\{',
    '(?:' + Object.keys(keywords).map(escapeRegExp).join('|') + ') ',
    '[\'"]((?:\\\\.|[^\'"\\\\])*)[\'"]',
    '(?: [\'"]((?:\\\\.|[^\'"\\\\])*)[\'"] \\w+)? ?',
    '\\}\\}'
    ].join(''), 'gm');
}

// Build a map of comments by line number
Parser.prototype.build_comments_map = function(template) {
  var comment_regexp = new RegExp("\\{\\s*\\{\\s*!" + this.comment + "([^}]+?)\\s*}\\s*}"),
      comments_map = this.comments_map = [];
  
  template.split(newline).forEach(function(val, index) {
    var match = val.match(comment_regexp);
    if (match) {
      comments_map[index+1] = match[1].trim();
    }
  });
};

/**
 * Given a Handlebars template string returns the list of i18n strings.
 *
 * @param String template The content of a HBS template.
 * @return Object The list of translatable strings, the line(s) on which each appears and an optional plural form.
 */
Parser.prototype.parse = function (template) {
  var result = {},
      match,
      msg,
      line;

  this.build_comments_map(template);

  while ((match = this.pattern.exec(template)) !== null) {
    msg = result[match[1]] = result[match[1]] || {};

    if (match[2]) {
      msg.plural = msg.plural || match[2];
    }
    line = template.substr(0, match.index).split(newline).length;
    if (this.comments_map[line-1]) {
      msg.comment = this.comments_map[line-1];
    }
    msg.line = msg.line || [];
    msg.line.push(line);
  }

  return result;
};

module.exports = Parser;
