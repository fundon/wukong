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
}

/**
 *  Add a file `plugin` to the middleware stack.
 *
 *  @param {GeneratorFunction} plugin
 *  @return {Wukong}
 *  @api public
 */

w.use = function (plugin, order) {
  order = (order || '').toLowerCase();
  switch (order) {
    case 'before':
      if (!this._before) this._before = [];
      this._before.push(plugin);
      break;
    case 'after':
      if (!this._after) this._after = [];
      this._after.push(plugin);
      break;
    default:
      if (!this._middle) this._middle = [];
      this._middle.push(plugin);
  }
  return this;
};

/**
 *  Get or set the files `metadata` to pass to templates.
 *
 *  @param {Object} metadata
 *  @return {Wukong}
 *  @api public
 */

w.metadata = function (metadata) {
  if (!arguments.length) return this.data;
  this.data = Object.create(metadata);
  debug('metadata %j', metadata);
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
  var ware = this.ware;
  var before = this.before;
  var middle = this.middle;
  var after = this.after;

  co(function *(self, src, dest) {
    var files = yield fs.walk(src);
    yield fs.rimraf(dest);
    self.before();
    ware.run(files, self, function *before() {
      self.middle();
      files = this.files;
      var len = files.length;
      var newFiles = Object.create(null);
      yield each(files, function *_each(fpath, i) {
        len--;
        var file = yield self.read(fpath, src);
        ware.run(file, files, self, function *seed() {
          /* jshint validthis:true */
          file = this.file;
          if (!file) return;
          yield self.write(file, dest);
          newFiles[file.path] = file;
          // last file completed!
          //if (!len) yield fn(newFiles);
          if (!len) {
            self.after();
            ware.run(newFiles, self, function *after() {
              yield fn(newFiles);
            });
          }
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
  file.path = path.relative(src, fpath);
  return file;
};

/**
 *  Write a file to the dest directory.
 *
 *  @param {Object} files
 *  @api private
 */

w.write = function *(file, dest) {
  var out = path.join(dest, file.path);
  var res = yield fs.mkdirp(path.dirname(out));
  if (!res.error) {
    yield fs.writeFile(out, file.contents);
    if (file.mode) yield fs.chmod(out, file.mode);
  }
};

w.before = function () {
  var ware = this.ware;
  var before = this._before;
  ware.use(beforeOrAfterOverride);
  if (before) {
    before.forEach(function (plugin) {
      ware.use(plugin);
    });
  }
};

w.middle = function () {
  var ware = this.ware;
  var middle = this._middle;
  ware.clear();
  ware.use(override);
  if (middle) {
    middle.forEach(function (plugin) {
      ware.use(plugin);
    });
  }
};

w.after = function () {
  var ware = this.ware;
  var after = this._after;
  ware.clear();
  ware.use(beforeOrAfterOverride);
  if (after) {
    after.forEach(function (plugin) {
      ware.use(plugin);
    });
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

function *beforeOrAfterOverride(next) {
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
