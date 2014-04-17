'use strict';

/**
 *  Module dependencies.
 */

var debug = require('debug')('wukong');
var path = require('path');
var co = require('co');
var fs = require('co-fs-plus');
var Ware = require('co-ware');
var fileModel = require('./file');

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
  this.file = fileModel;
  // reference wukong
  this.file.wukong = this;
}

/**
 *  Add a file `plugin` to the middleware stack.
 *
 *  @param {GeneratorFunction} plugin
 *  @return {Object} self
 *  @api public
 */

w.use = function (plugin, around) {
  around = (around || '').toLowerCase();
  switch (around) {
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

w._useInit = function (arr) {
  var ware = this.ware;
  ware.clear();
  ware.use(override);
  if (arr) {
    arr.forEach(function (plugin) {
      ware.use(plugin);
    });
  }
};

/**
 *  Create a file instance.
 *
 *  @return {Object} file
 *  @api public
 */

w.createFile = function () {
  return Object.create(this.file);
};

/**
 *  Get or set the files `metadata` to pass to templates.
 *
 *  @param {Object} metadata
 *  @return {Object} self
 *  @api public
 */

w.metadata = function (metadata) {
  if (!arguments.length) return this.data;
  this.data = Object.create(metadata);
  debug('metadata %j', metadata);
  return this;
};

/**
 *  Get or set the post `link` to pass to templates.
 *
 *  @param {String} path
 *  @return {Object} self
 *  @api public
 */

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
 *  @return {Object} self
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
 *  @return {Object} self
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
  var src = this.source();
  var dest = this.destination();
  var self = this;

  // paralle

  // file process
  function *process(fpath, files) {
    var file = Object.create(self.file);
    file.originalPath = fpath;
    file.path = path.relative(src, fpath);
    yield file.read();
    return yield processDone(file, files);
  };

  // file process done
  function processDone(file, files) {
    return function (done) {
      self.run(file, files, function *() {
        done(null, this.file);
      });
    };
  }

  // get all files path
  function *getFiles() {
    yield fs.rimraf(dest);
    return yield fs.walk(src);
  };

  // write all files
  function *writeFiles(files) {
    var i = 0, l = files.length;
    for (; i < l; i++) {
      yield files[i].write();
    }
  }

  // before/after batch files
  // before: files = [path, path..]
  // after:  files = [{file}, {file}...]
  function batchFiles(files) {
    return function (done) {
      self.run(null, files, function *() {
        done(null, this.files);
      });
    };
  }

  // batch files
  function *batch(files) {
    var arr = [];
    for (var i = 0, l = files.length; i < l; i++) {
      if (files[i]) arr.push(yield process(files[i], files));
    }
    yield arr;
    for (i = 0; i < l; i++) {
      if (!arr[i]) {
        arr.splice(i, 1);
        i--; l--;
      }
    }
    return arr;
  }

  function *build() {
    var files = yield getFiles();
    // before
    self._useInit(self._before);
    files = yield batchFiles(files);
    // middle
    self._useInit(self._middle);
    var newFiles = yield batch(files);
    // after
    self._useInit(self._after);
    newFiles = yield batchFiles(newFiles);
    yield writeFiles(newFiles);
    yield fn(newFiles);
  }

  co(build)();
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
 *  Empty generator function.
 *
 *  @api private
 */

function *noop() {}

