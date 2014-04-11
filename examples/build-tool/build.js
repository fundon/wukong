var Wukong = require('../..')
var extname = require('path').extname;
var myth = require('myth');

var w = Wukong(__dirname)
  .use(concat('index.css'))
  .build();

function concat(fileName, opt) {
  var newFile = Object.create(null);
  var css = '';
  var i = 0;
  return function *concat(next) {
    var file = this.file;
    i++;
    css += file.contents.toString();
    delete this.file;

    if (i === this.files.length) {
      i = 0;
      css = myth(css);
      newFile.name = fileName;
      newFile.contents = new Buffer(css);
      this.file = newFile;
      yield next;
    }
  };
}

