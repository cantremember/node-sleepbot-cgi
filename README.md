# node-sleepbot-cgi

A [Node.js](https://nodejs.org) app to replace legacy Perl CGI scripts for [sleepbot.com](http://sleepbot.com)

  [![Build status][travis-img]][travis-url]
  [![Test coverage][coveralls-img]][coveralls-url]
  [![Dependency status][david-img]][david-url]
  [![License][license-img]][license-url]

Provided as a [GitHub project](https://github.com/cantremember/node-sleepbot-cgi) example,
since no one in their right might has any need for this code besides me.


## Documentation

The [JSDoc](https://cantremember.github.io/node-sleepbot-cgi/) is provided via GitHub Pages.


## Works In Progress

### ES Modules Support

There seem to be some competing thoughts and proposals amongst the Node.js Community as they move towards adopting a static synchronous `import` paradigm.
In the absence of a true definitive guide,

- this project uses the '*.mjs' filename convention called out in [Native ES Modules in NodeJS](https://medium.com/@giltayar/native-es-modules-in-nodejs-status-and-future-directions-part-i-ee5ea3001f71).
- its `package.json` has a "module" property,
  though its use may be incorrect since the [In Defense of .js](https://github.com/dherman/defense-of-dot-js/blob/master/proposal.md) proposal may or may not be current.
- `import` capabilities are provided by the [esm](https://github.com/standard-things/esm) package,
  vs. the "native command line option" mentioned in Dr. Rauschmayer's article on [Using ES modules natively in Node.js](http://2ality.com/2017/09/native-esm-node.html).


## Contributing

[Seriously?](CONTRIBUTING.md)

*Okay `:D`*


## License

[WTFPL][license-url]


[travis-img]: https://img.shields.io/travis/cantremember/node-sleepbot-cgi.svg?style=flat-square
[travis-url]: https://travis-ci.org/cantremember/node-sleepbot-cgi
[coveralls-img]: https://img.shields.io/coveralls/cantremember/node-sleepbot-cgi.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/cantremember/node-sleepbot-cgi
[david-img]: https://img.shields.io/david/cantremember/node-sleepbot-cgi.svg?style=flat-square
[david-url]: https://david-dm.org/cantremember/node-sleepbot-cgi
[license-img]: https://img.shields.io/badge/license-WTFPL-blue.svg?style=flat-square
[license-url]: LICENSE
