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
  this.ware = new Ware();
  this.use(override);
}

/**
 *  Add a `plugin` to the middleware stack.
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
  co(function *(self) {
    var files = yield self.read();
    debug('read files %j', files);
    self.run(files, function *build() {
      yield self.write(this.output);
      yield fn(this.output);
    });
  })(this);
};

/**
 *  Run a set of `files` through the middleware stack.
 *
 *  @param {Object} files
 *  @param {GeneratorFunction} fn
 *  @api public
 */

w.run = function (files, fn) {
  this.ware.run(this, files, fn);
};

/**
 *  Read the source directory, parsing front matter.
 *
 *  @return {Object} files
 *  @api private
 */

w.read = function *() {
  var files = Object.create(null);
  var src = this.source();
  var filenames = yield fs.walk(src);
  var i, l, filename, name, buffer, file, stat, parsed;
  for (i = 0, l = filenames.length; i < l; i++) {
    filename = filenames[i];
    name = path.relative(src, filename);
    stat = yield fs.stat(filename);
    buffer = yield fs.readFile(filename);
    file = { contents: buffer };
    if (utf8(buffer)) {
      parsed = front(buffer.toString());
      file = parsed.attributes;
      file.contents = new Buffer(parsed.body);
    }
    file.mode = new Mode(stat).toOctal();
    files[name] = file;
  }
  return files;
};

/**
 *  Write a dictionary of `files` to the dest directory.
 *
 *  @param {Object} files
 *  @api private
 */

w.write = function *(files) {
  debug('write files %j', files);

  var dest = this.destination();
  return yield each(files, function *(file, name) {
    var out = path.join(dest, name);
    var res = yield fs.mkdirp(path.dirname(out));
    if (!res.error) {
      yield fs.writeFile(out, file.contents);
      if (file.mode) yield fs.chmod(out, file.mode);
    }
  });

  function each(obj, done) {
    var res = [], name;
    for (name in obj) {
      res[name] = done(obj[name], name, obj);
    }
    return res;
  }
};

/**
 *  Override `input` and `wukong`.
 *
 *  @api private
 */

function *override(next) {
  /*jshint validthis:true */
  this.wukong = this.input[0];
  this.input = this.input[1];
  yield next;
}

/**
 *  Empty generator function.
 *  @api private
 */

function *noop() {}
