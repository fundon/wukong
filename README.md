# Wukong [*悟空*]

[Metalsmith][] inspired, pluggable static site generator using generators via [co][] and [co-ware][].

In Wukong (likes Metalsmith)

```js
Wukong(__dirname)
  .use(function *() {
    var css = '', file;

    // Input files.
    var files = this.i;

    while ((file = files.shift())) {
      if ('.css' != extname(file.name)) continue;
      css += file.contents.toString();
    }

    css = myth(css);

    // Output index.css
    this.i['index.css'] = {
      contents: new Buffer(css)
    };

    yield next;
  })
  .build();
```



[co]: https://github.com/visionmedia/co
[co-ware]: https://github.com/fundon/co-ware
[metalsmith]: https://github.com/segmentio/metalsmith
