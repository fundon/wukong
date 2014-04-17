'use strict';

/**
 *  Module dependencies.
 */

var path = require('path');
var utf8 = require('is-utf8');
var Mode = require('stat-mode');
var front = require('front-matter');
var fs = require('co-fs-plus');

/**
 *  Expose `File` Prototype.
 */

module.exports = {

  _buffer: null,

  writed: false,

  set buffer(buf) {
    this._buffer = new Buffer(buf);
  },

  get buffer() {
    return this._buffer;
  },

  get mode() {
    return this.stat 
      ? new Mode(this.stat).toOctal()
      : null;
  },

  set attributes(attrs) {
    Object.keys(attrs).forEach(function (k) {
      this[k] = attrs[k];
    }.bind(this));
  },

  get contents() {
    return this._buffer
      ? this._buffer.toString()
      : '';
  },

  set contents(contents) {
    this.buffer = contents;
  },

  get length() {
    return this.contents.length;
  },

  get src() {
    return this.wukong.source();
  },

  get dest() {
    return this.wukong.destination();
  },

  /**
   *  Read the source file, parsing front matter.
   */

  read: function *read() {
    var fpath = this.originalPath;
    this.buffer = yield fs.readFile(fpath);
    if (utf8(this.buffer)) {
      var parsed = front(this.contents);
      this.attributes = parsed.attributes;
      this.buffer = parsed.body;
    }
    this.stat = yield fs.stat(fpath);
    return this;
  },

  /**
   *  Write a file to the dest directory.
   */

  write: function *write() {
    var out = path.join(this.dest, this.path);
    var res = yield fs.mkdirp(path.dirname(out));
    if (!res.error) {
      yield fs.writeFile(out, this.contents);
      if (this.mode) yield fs.chmod(out, this.mode);
      this.writed = true;
    }
    return this;
  }

};
