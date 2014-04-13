'use strict';

var wukong = require('../..');
var extname = require('path').extname;
var myth = require('myth');

wukong(__dirname)
  .use(concat('index.css'))
  .build();

function concat(fileName) {
  var newFile = Object.create(null);
  var css = '';
  var i = 0;
  return function *concat(next) {
    var file = this.file;
    i++;
    if ('.css' !== extname(file.path)) yield next;
    css += file.contents.toString();
    delete this.file;

    if (i === this.files.length) {
      i = 0;
      css = myth(css);
      newFile.path = fileName;
      newFile.contents = new Buffer(css);
      this.file = newFile;
      yield next;
    }
  };
}

