'use strict';

var async = require('async');
var wukong = require('../..');
var prompt = require('cli-prompt');
var render = require('consolidate').handlebars.render;

/**
 * Build.
 */

wukong(__dirname)
  .use(ask, 'before')
  .use(template)
  .build();

/**
 * Prompt plugin.
 *
 * @param {GeneratorFunction} next
 */

function *ask(next) {
  var prompts = ['name', 'repository', 'description', 'license'];

  var metadata = this.wukong.metadata();

  yield eachSeries(prompts, run);

  yield next;

  function eachSeries(prompts, run) {
    return function(done) {
      async.eachSeries(prompts, run, done);
    };
  }

  function run(key, done) {
    prompt('  ' + key + ': ', function(val) {
      metadata[key] = val;
      done();
    });
  }
}

/**
 *  Template in place plugin.
 *
 *  @param {GeneratorFunction} next
 */

function *template(next) {
  var file = this.file;
  var metadata = this.wukong.metadata();

  yield run(file);
  yield next;

  function run(file) {
    var str = file.contents.toString();
    return function (done) {
      render(str, metadata, function(err, res) {
        if (err) return done(err);
        file.contents = new Buffer(res);
        done(null, file);
      });
    };
  }
}
