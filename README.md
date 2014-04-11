# Wukong [*悟空*] [![Build Status](https://travis-ci.org/fundon/wukong.svg)](https://travis-ci.org/fundon/wukong)

[Metalsmith][] inspired, pluggable static site generator using generators via [co][] and [co-ware][].

In Wukong (likes in Metalsmith)

```js
Wukong(__dirname)
  // files's middlewares
  .useGlobal(function *() {
    tihs.files = this.files
      .filter(function (v) {
        return v === 'index';
      });

    yield next;
  })
  // file's middlewares
  .use(function *() {
    var file = this.file;
    file.contents = myth(file.contents);
    yield next;
  })
  .build();
```

### APIs

#### use(*plugin)

  Add a middleware for the `file` object.

#### run(file, *callback)

  Run a set of `file` through the middleware stack

#### useGlobal(*plugin)

  Add a middleware for the `files` array.
  The `files` array is just only storing names.

#### runGlobal(files, *callback)

  Run a set of `files` through the middleware stack

#### metadata([metadata])

#### site([path])

#### source([path])

#### destination([path])

#### join([path...])

#### build([*callback])

[co]: https://github.com/visionmedia/co
[co-ware]: https://github.com/fundon/co-ware
[metalsmith]: https://github.com/segmentio/metalsmith
