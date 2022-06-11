# node-sleepbot-cgi

A [Node.js](https://nodejs.org) app to replace legacy Perl CGI scripts for [sleepbot.com](http://sleepbot.com)

  [![Build status][githubactions-img]][githubactions-url]
  [![Dependency status][david-img]][david-url]
  [![License][license-img]][license-url]

Provided as a [GitHub project](https://github.com/cantremember/node-sleepbot-cgi) example,
since no one in their right might has any need for this code besides me.


## Running

```sh
npm run start

make server

# within Docker, as deployed
#   expects production mongo credentials and other ENVs
make container
make compose
```


## Environment Configuration

from 'config/*.json'

- NODE_ENV
- httpPort
- baseURL
- wwwRoot
- viewsRoot
- caching
- ... and more

```bash
# the Dockerfile self-specifies its own ENVs
httpPort=3000 wwwRoot="/opt/www/sleepbot.com"  make server
```


## Documentation

The [JSDoc](https://cantremember.github.io/node-sleepbot-cgi/) is provided via GitHub Pages.


## Contributing

[Seriously?](CONTRIBUTING.md)

*Okay `:D`*


## License

[WTFPL][license-url]


[githubactions-img]: https://github.com/cantremember/node-sleepbot-cgi/workflows/CI/badge.svg
[githubactions-url]: https://github.com/cantremember/node-sleepbot-cgi/actions
[david-img]: https://img.shields.io/david/cantremember/node-sleepbot-cgi.svg?style=flat-square
[david-url]: https://david-dm.org/cantremember/node-sleepbot-cgi
[license-img]: https://img.shields.io/badge/license-WTFPL-blue.svg?style=flat-square
[license-url]: http://www.wtfpl.net/
