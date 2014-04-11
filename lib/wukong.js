'use strict';

/**
 *  Module dependencies.
 */

var debug = require('debug')('wukong');
var path = require('path');
var utf8 = require('is-utf8');
var front = require('front-matter');
var Mode = require('stat-mode');
var Ware = require('co-ware');
var each = require('co-each');
var fs = require('co-fs-plus');
var co = require('co');

/**
 *  `slice()` reference.
 */

var slice = Array.prototype.slice;

/**
 *  Wukong prototype.
 */

var w = Wukong.prototype;

/**
 *  Expose `Wukong`.
 */

module.exports = Wukong;

/**
 *  Initialize a new `Wukong` builder with a working `dir`.
 *
 *  @param {String} dir
 */

function Wukong(dir) {
  if (!(this instanceof Wukong)) return new Wukong(dir);
  this.dir = path.resolve(dir);
  this.data = Object.create(null);
  this.site('site');
  this.source('src');
  this.destination('build');
  // file's middlewares
  this.ware = new Ware();
  this.use(override);
  // files's middlewares
  this.globalWare = new Ware();
  this.useGlobal(globalOverride);
}

/**
 *  Add a file `plugin` to the middleware stack.
 *
 *  @param {GeneratorFunction} plugin
 *  @return {Wukong}
 *  @api public
 */

w.use = function (plugin) {
  this.ware.use(plugin);
  return this;
};

/**
 *  Add a files `plugin` to the middleware stack.
 *
 *  @param {GeneratorFunction} plugin
 *  @return {Wukong}
 *  @api public
 */

w.useGlobal = function (plugin) {
  this.globalWare.use(plugin);
  return this;
};

/**
 *  Get or set the global `metadata` to pass to templates.
 *
 *  @param {Object} metadata
 *  @return {Wukong}
 *  @api public
 */

w.metadata = function (metadata) {
  if (!arguments.length) return this.data;
  this.data = Object.create(metadata);
  debug('metadata %s', metadata);
  return this;
};

w.site = function (path) {
  if (!arguments.length) return this.join(this._site);
  this._site = path;
  debug('site %s', path);
  return this;
};

/**
 *  Get or set the source directory.
 *
 *  @param {String} path
 *  @return {Wukong}
 *  @api public
 */

w.source = function (path) {
  if (!arguments.length) return this.join(this._src);
  this._src = path;
  debug('source %s', path);
  return this;
};

/**
 *  Get or set the destination directory.
 *
 *  @param {String} path
 *  @return {Wukong}
 *  @api public
 */

w.destination = function (path) {
  if (!arguments.length) return this.join(this._dest);
  this._dest = path;
  debug('destination %s', path);
  return this;
};

/**
 *  Join path `strs` with the working directory.
 *
 *  @param {String} strs...
 *  @return {String}
 *  @api public
 */

w.join = function () {
  var strs = slice.call(arguments);
  strs.unshift(this.dir);
  return path.join.apply(path, strs);
};

/**
 *  Build with the current settings to the dest directory.
 *
 *  @param {GeneratorFunction} fn
 *  @api public
 */

w.build = function (fn) {
  fn = fn || noop;
  co(function *(self, src, dest) {
    var files = yield fs.walk(src);
    yield fs.rimraf(dest);
    self.runGlobal(files, function *run() {
      files = this.files;
      yield each(files, function *(fpath) {
        var file = yield self.read(fpath, src);
        self.run(file, files, function *build() {
          /* jshint validthis:true */
          file = this.file;
          if (!file) return;
          yield self.write(file, dest);
          yield fn(file);
        });
      });
    });
  })(this, this.source(), this.destination());
};

/**
 *  Run a set of `file` through the middleware stack.
 *
 *  @param {Object} file
 *  @param {GeneratorFunction} fn
 *  @api public
 */

w.run = function (file, files, fn) {
  this.ware.run(file, files, this, fn);
};

/**
 *  Run a set of `files` through the middleware stack.
 *
 *  @param {Object} file
 *  @param {GeneratorFunction} fn
 *  @api public
 */

w.runGlobal = function (files, fn) {
  this.globalWare.run(files, this, fn);
};

/**
 *  Read the source file, parsing front matter.
 *
 *  @return {Object} files
 *  @api private
 */

w.read = function *(fpath, src) {
  var file = Object.create(null);
  var stat = yield fs.stat(fpath);
  var buffer = yield fs.readFile(fpath);
  file.contents = buffer;
  if (utf8(buffer)) {
    var parsed = front(buffer.toString());
    file = parsed.attributes;
    file.contents = new Buffer(parsed.body);
  }
  //file.stat = stat;
  file.mode = new Mode(stat).toOctal();
  file.name = path.relative(src, fpath);
  return file;
};

/**
 *  Write a file to the dest directory.
 *
 *  @param {Object} files
 *  @api private
 */

w.write = function *(file, dest) {
  var out = path.join(dest, file.name);
  var res = yield fs.mkdirp(path.dirname(out));
  if (!res.error) {
    yield fs.writeFile(out, file.contents);
    if (file.mode) yield fs.chmod(out, file.mode);
  }
};

/**
 *  Override `input` and `wukong` of the file.
 *
 *  @api private
 */

function *override(next) {
  /* jshint validthis:true */
  this.file = this.input[0];
  this.files= this.input[1];
  this.wukong = this.input[2];
  yield next;
}

/**
 *  Override `input` and `wukong` of the files.
 *
 *  @api private
 */

function *globalOverride(next) {
  /* jshint validthis:true */
  this.files= this.input[0];
  this.wukong = this.input[1];
  yield next;
}

/**
 *  Empty generator function.
 *  @api private
 */

function *noop() {}
