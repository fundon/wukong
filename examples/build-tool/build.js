var Wukong = require('../..')
var extname = require('path').extname;
var myth = require('myth');

var w = Wukong(__dirname)
  .use(concat)
  .build();

function *concat(next) {
  var css = '', file;
  var files = this.files;

  for (var name in files) {
    if ('.css' != extname(name)) continue;
    css += files[name].contents.toString();
    delete files[name];
  }

  css = myth(css);

  this.files['index.css'] = {
    contents: new Buffer(css)
  };

  yield next;
}
