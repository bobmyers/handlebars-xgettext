var newline = /\r?\n|\r/g,
    escapeRegExp = function (string) {
      // source: https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
      return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
    };

/**
 * Constructor
 */
function Parser(keywords, comment) {
  this.keywords = keywords || { gettext: { singular: 1 }, _: { singular: 1 } };
  this.comment = comment;
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
      match_parms,
      msg,
      line,
      val,
      index,
      parms,

      // A directive is something enclosed in {{ }},
      // which may start with a # but not a ! (comment) or / (closing tag),
      // then comes the directive name,
      // followed optionally by positional and/or named paramters.
      directive_regexp = /\{\s*\{\s*#?([^!\/]\S*?)(\s+[^]*?)?\s*\}\s*\}/gm,

      parms_regexp = /(?:\S+=\s*)?(".*?[^\\]"|'.*?[^\\]'|\S+)/g;

  this.build_comments_map(template);

  while ((match = directive_regexp.exec(template))) {

    // Get the argnum handling info for this directive(helper), if any
    var keyword_argnums = this.keywords[match[1]];
    if (!keyword_argnums) { continue; }

    line = template.substr(0, match.index).split(newline).length;
    var parsed_parms = {positional: [], named: []}, pos=0, parsed_parms_type;

    function make_msg(singular, plural, context, comment, line) {
      var msg = result[singular] = result[singular] || {};
      if (plural) { msg.plural = plural; }
      if (context) { msg.context = context; }
      if (comment) { msg.comment = comment; }
      msg.line = msg.line || [];
      msg.line.push(line);
    }

    // parse arguments
    if (match[2] && (match_parms = match[2].match(parms_regexp))) {
      match_parms.forEach(function(parm) {
        var equal_pos = parm.indexOf('=');
        if (equal_pos >= 0) {
          val = parm.substring(equal_pos+1).trim();
          index = parm.substring(0, equal_pos).trim();
          parsed_parms_type = parsed_parms.named;
          if (!keyword_argnums.named[index] && !keyword_argnums.named['*']) { val = null; }
        } else {
          index = pos++;
          val = parm;
          parsed_parms_type = parsed_parms.positional;
        }
        
        if (/^['"].+['"]$/.test(val)) {
          parsed_parms_type[index] = val.slice(1,-1);
        }
      });
      
      if (parsed_parms.positional.length) {
        var singular_index = keyword_argnums.positional.singular,
            singular_msg = parsed_parms.positional[singular_index-1],
            plural_index = keyword_argnums.positional.plural,
            plural_msg = parsed_parms.positional[plural_index-1],
            context_index = keyword_argnums.positional.context,
            context_msg = parsed_parms.positional[context_index-1];

        make_msg(singular_msg, plural_msg, context_msg, this.comments_map[line-1], line);
      }

      Object.keys(parsed_parms.named).forEach(function(named_parm) {
        make_msg(parsed_parms.named[named_parm], null, null, this.comments_map[line-1], line);
      }, this);
      
    }
  }
  return result;
};

module.exports = Parser;
