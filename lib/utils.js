'use strict';

/**
 *  Module dependencies.
 */

var chalk = require('chalk');
var thunkify = require('thunkify');

/**
 *  Log an error and then exit the process.
 *
 *  @param {String} message
 */

exports.fatal = function (msg) {
  console.error();
  console.error(chalk.red('  Wukong') + chalk.gray(' · ') + msg);
  console.error();
  process.exit(1);
};

/**
 *  Log a `message`.
 *
 *  @param {String} message
 */

exports.log = function (message) {
  console.log();
  console.log(chalk.gray('  Wukong · ') + message);
  console.log();
};

exports.isMetalsmithPlugin = function (name) {
  name = name.split('-');
  return 'metalsmith' === name[0];
};

exports.wrapMetalsmithPlugin = function (name) {
  var m = require(name);
  return function (options) {
    m = thunkify(m(options));
    function *plugin(next) {
      yield m(this.files, this.wukong);
      yield next;
    }
    plugin._name = name;
    return plugin;
  };
};
