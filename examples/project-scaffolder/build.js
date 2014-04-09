var async = require('async');
var Wukong = require('../..');
var prompt = require('cli-prompt');
var co = require('co');
var render = require('consolidate').handlebars.render;

/**
 * Build.
 */

var wk = Wukong(__dirname)
  .use(ask)
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

  var files = this.files;
  var keys = Object.keys(files);
  var metadata = this.wukong.metadata();

  for (var i = 0, l = keys.length; i < l; i++) {
    yield run(keys[i]);
  }

  yield next;

  function run(file) {
    var str = files[file].contents.toString();
    return function (done) {
      render(str, metadata, function(err, res) {
        if (err) return done(err);
        files[file].contents = new Buffer(res);
        done(null, files[file]);
      });
    };
  }
}
