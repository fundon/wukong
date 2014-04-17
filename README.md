# Wukong [*悟空*] [![Build Status](https://travis-ci.org/fundon/wukong.svg)](https://travis-ci.org/fundon/wukong)

Next-gen for Pluggable Static Site Generator using generators via [co][] and [co-ware][].

[Metalsmith][] inspired.


In Wukong (likes in Metalsmith)

```js
Wukong(__dirname)
  // files's middlewares
  .use(function *(next) {
    tihs.files = this.files
      .filter(function (v) {
        return v === 'index';
      });

    yield next;
  }, 'before')
  // file's middlewares
  .use(function *(next) {
    var file = this.file;
    file.contents = myth(file.contents);
    yield next;
  })
  .build();
```

### APIs

#### File

```js
{
  path: {String},
  mode: {Number}, // oct
  contents: {String},
  metadata: {Object},
  buffer: {Buffer}
  ...
}
```


#### `Files`

##### Before

```js
[ 'wukong.js', 'reset.css', ... ]

```
##### After

```js
[ File, File, ... ]
```


#### createFile()

  Create a File instance.


#### use(*plugin, [type])

  Add a middleware for the `file` object.

  `type`: before/after


#### build([*callback])

  Start to build files.


#### run(file, files, *callback)

  Run a set of `file`, `files` through the middleware stack


#### metadata([metadata])

  Get/set metadata.


#### site([path])

  Get/set site.


#### source([path])

  Get/set source.


#### destination([path])

  Get/set destination.


#### join([path...])

  Join the current dir


### License

MIT

[co]: https://github.com/visionmedia/co
[co-ware]: https://github.com/fundon/co-ware
[metalsmith]: https://github.com/segmentio/metalsmith
