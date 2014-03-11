var Wukong = require('../..')
var extname = require('path').extname;
var myth = require('myth');

var w = Wukong(__dirname)
  .use(concat)
  .build();

function *concat(next) {
  var css = '', file;
  var files = this.i;

  while ((file = files.shift())) {
    if ('.css' != extname(file.name)) continue;
    css += file.contents.toString();
  }

  css = myth(css);

  this.i['index.css'] = {
    contents: new Buffer(css)
  };

  yield next;
}
