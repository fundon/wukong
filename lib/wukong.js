
/**
 *  Module dependencies.
 */

var path = require('path');
var utf8 = require('is-utf8');
var front = require('front-matter');
var Ware = require('co-ware');
var fs = require('co-fs-plus');
var co = require('co');
var noop = function(){};

/**
 *  Wukong prototype.
 */

var w = Wukong.prototype;

/**
 *  Expose `Wukong`.
 */

module.exports = Wukong;

/**
 * Initialize a new `Wukong` builder with a working `dir`.
 *
 * @param {String} dir
 */

function Wukong(dir) {
  if (!(this instanceof Wukong)) return new Wukong(dir);
  this.dir = path.resolve(dir);
  this.ware = new Ware();
  this.data = {};
  this.site('site');
  this.source('src');
  this.destination('build');
}

/**
 * Add a `plugin` to the middleware stack.
 *
 * @param {Function} plugin
 * @return {Metalsmith}
 */

w.use = function (plugin) {
  this.ware.use(plugin);
  return this;
};

/**
 * Get or set the global `metadata` to pass to templates.
 *
 * @param {Object} metadata
 * @return {Object or Metalsmith}
 */

w.metadata = function (metadata) {
  if (!arguments.length) return this.data;
  this.data = metadata;
  return this;
};

w.site = function (path) {
  if (!arguments.length) return this.join(this._site);
  this._site = path;
  return this;
};

/**
 * Get or set the source directory.
 *
 * @param {String} path
 * @return {String or Metalsmith}
 */

w.source = function (path) {
  if (!arguments.length) return this.join(this._src);
  this._src = path;
  return this;
};

/**
 * Get or set the destination directory.
 *
 * @param {String} path
 * @return {String or Metalsmith}
 */

w.destination = function (path) {
  if (!arguments.length) return this.join(this._dest);
  this._dest = path;
  return this;
};

/**
 * Join path `strs` with the working directory.
 *
 * @param {String} strs...
 * @return {String}
 */

w.join = function () {
  var strs = [].slice.call(arguments);
  strs.unshift(this.dir);
  return path.join.apply(path, strs);
};

/**
 * Build with the current settings to the dest directory.
 *
 * @param {Function} fn
 */

w.build = function (fn) {
  fn = fn || noop;
  var ware = this.ware;
  var self = this;
  co(function *() {
    var files = yield self.read();
    ware
      .use(function *() {
        yield self.write(this.i)
        fn();
      })
      .run(files, self);
  })();
};

/**
 * Read the source directory, parsing front matter.
 *
 * @api private
 */
w.read = function *() {
  var src = this.source();
  var filenames = yield fs.walk(src);
  var files = [];
  var i = 0, filename, buffer, file, parsed;
  while ((filename = filenames[i])) {
    buffer = yield fs.readFile(filename);
    file = {
      contents: buffer
    };
    if (utf8(buffer)) {
      parsed = front(buffer.toString());
      file = parsed.attributes;
      file.contents = new Buffer(parsed.body);
    }
    if (!file.name) {
      file.name = path.relative(src, filename);
    }
    files.push(file);
    i++;
  }
  return files;
};

/**
 * Write a dictionary of `files` to the dest directory.
 *
 * @param {Object} files
 * @api private
 */

w.write = function *(files) {
  var dest = this.destination();

  return yield each(files, function *(file, name) {
    var out = path.join(dest, name);
    var res = yield fs.mkdirp(path.dirname(out));
    if (!res.error) {
      yield fs.writeFile(out, file.contents);
    }
  });

  function each(object, done) {
    var res = [];
    for (var name in object) {
      res[name] = done(object[name], name, object);
    }
    return res;
  }
};
