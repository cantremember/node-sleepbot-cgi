'use strict';

// https://github.com/gulpjs/gulp


/* istanbul ignore next */

var path = require('path');

var gulp = require('gulp');
var clean = require('gulp-clean');
var sourcemaps = require('gulp-sourcemaps');
var symlink = require('gulp-symlink');
var babel = require('gulp-babel');

// parallel only, can't create
//   https://github.com/gulpjs/gulp/issues/96
//   https://github.com/dominictarr/event-stream
//   https://www.npmjs.com/package/streamqueue

var GLOBS = Object.freeze({
    source: [ 'app/**/*.js', 'app.js', 'index.js', 'lib/**/*.js' ],
    test:   [ 'test/**/*.js' ],
    config: [ 'config/**/*.js' ],
    views:  [ 'views/**' ],
});

function cleanBuild() {
    return gulp.src('build')
        .pipe(clean({ force: true }))
    ;
}
function es5SymlinkViews() {
    return gulp.src('views')
        .pipe(symlink('build/es5/views', { force: true }))
    ;
}
function es5CompileSource() {
    var globs = GLOBS.source.concat(GLOBS.test).concat(GLOBS.config).map(function(glob) {
        return './' + glob;
    });
    return gulp.src(globs, { base: './' })
        .pipe(sourcemaps.init({ debug: true }))
        .pipe(babel({
            stage: 2,
            compact: false,
        }))
        .pipe(sourcemaps.write('../sourcemaps', { debug: true }))
        .pipe(gulp.dest('build/es5'))
    ;
}
function sourceWatch() {
    var globs = GLOBS.source.concat(GLOBS.test).concat(GLOBS.config);
    var watcher = gulp.watch(globs, {
        interval: 1000,
        debounceDelay: 2000,
    }, [ 'es5-babel' ]);

    watcher.on('change', function(event) {
        var filepath = (event && event.path);
        if (filepath) {
            // the last segment
            var parts = filepath.split(path.sep);
            console.log('   ', parts[parts.length - 1]);
        }
    });

    return watcher;
}


gulp.task('default', [ 'compile' ]);

// cannot do a "clean, then compile" in sequence, so don't clean
gulp.task('compile', [ 'es5-views', 'es5-babel' ]);
gulp.task('clean', cleanBuild);

gulp.task('es5-views', es5SymlinkViews);
gulp.task('es5-babel', es5CompileSource);

gulp.task('watch', sourceWatch);
