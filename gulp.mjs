/* istanbul ignore file */

import gulp from 'gulp';
import clean from 'gulp-clean';
import eslint from 'gulp-eslint';
import jsdoc from 'gulp-jsdoc3';

// TODO:  import ... assert { type: 'json' };
//   required by Node 16, unsupported by ESLint 8.x
//   https://github.com/eslint/eslint/discussions/15305
import { readFileSync } from 'fs';
// TODO:  import JSDOC_CONFIG from './.jsdoc.json'; assert { type: 'json' };
const JSDOC_CONFIG = JSON.parse(readFileSync(new URL('.jsdoc.json', import.meta.url)));

// also @see Makefile
// TODO:  import PACKAGE_JSON from './package.json' assert { type: 'json' };
const PACKAGE_JSON = JSON.parse(readFileSync(new URL('package.json', import.meta.url)));
const SOURCE_GLOBS = PACKAGE_JSON.nyc.include;


const GLOBS = Object.freeze({
  source: SOURCE_GLOBS,
  test:   [
    'test/bootstrap.mjs',
    'test/**/*.mjs',
  ],
  views:  [ 'views/**' ],
});


function taskClean() {
  return gulp.src('build', {
    allowEmpty: true,
  })
  .pipe(clean({
    force: true,
  }));
}

/**
 * @see https://github.com/eslint/eslint
 * @see http://eslint.org/docs/user-guide/configuring
 * @see http://eslint.org/docs/rules/
 */
function taskLint() {
  const { source, test } = GLOBS;

  return gulp.src(
    source.concat(test)
  )
  .pipe(eslint({
    configFile: './.eslintrc',
    quiet: false,
    fix: false,
  }))
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
}

/**
 * @see https://github.com/jsdoc3/jsdoc
 * @see http://usejsdoc.org/
 */
function taskDoc(cb) {
  const { source, test } = GLOBS;
  const task = jsdoc(JSDOC_CONFIG, cb);

  return gulp.src(
    // the source file list seems to be disregarded;
    //   when i omit any part of the `source` JSON config,
    //   only '*.js' files get processed :(
    source.concat(test)
  )
  .pipe(task);
}

// gulp@4 made sequencing so darn easy
//   this is a worthless example because this Project doesn't *need* refinements
//   but it's good to remember how it gets done ;)
const taskDefault = gulp.series(
  taskLint,
  gulp.parallel( taskDoc )
);


gulp.task('clean', taskClean);
gulp.task('lint', taskLint);
gulp.task('doc', taskDoc);

gulp.task('default', taskDefault);
