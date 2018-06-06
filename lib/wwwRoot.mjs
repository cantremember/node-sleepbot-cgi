import Promise from 'bluebird';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import glob from 'glob';

import theConfig from './config';


const FS_READ_OPTIONS = Object.freeze({
  encoding: 'utf8'
});
const CSV_PARSE_OPTIONS = Object.freeze({
  cast: false,
  comment: undefined, // '#'
  delimiter: '\t', // TSV
  skip_empty_lines: true,
  trim: true,
});


/**
 * #### A Library of Functions relating to `wwwRoot` from {@link config}
 *
 * &nbsp;
 *
 * @namespace wwwRoot
 */
export default {
  /**
   * @returns {String} the value of `wwwRoot` from {@link config}
   */
  get basePath() {
    return theConfig.get('wwwRoot');
  },

  /**
   * @see lib.dataColumnMap
   * @memberof wwwRoot
   * @param {String} relativePath a path relative to {@link wwwRoot}
   * @param {Object<Integer>} [options] options for a [csv](https://www.npmjs.com/package/csv) parser
   * @returns {Promise<Array>} a Promise resolving the rows of the TSV file at `relativePath`
   */
  async willLoadTSV(relativePath, options = CSV_PARSE_OPTIONS) {
    const headersAndColumns = await new Promise((resolve, reject) => {
      try {
        const filepath = path.join(this.basePath, relativePath);
        const reader = fs.createReadStream(filepath, FS_READ_OPTIONS);
        const parser = csvParse(options);
        const results = [];

        // http://csv.adaltas.com/parse/examples/
        parser.on('error', reject);
        parser.on('readable', () => {
          let data;
          while (data = parser.read()) { // eslint-disable-line no-cond-assign
            results.push(data);
          }
        });
        parser.on('end', () => {
          // do not release Zalgo
          setImmediate(() => {
            resolve(results);
          });
        });

        reader.on('error', reject);
        reader.pipe(parser);
      }
      catch (err) {
        reject(err);
      }
    });

    // drop the the headers
    return headersAndColumns.slice(1);
  },

  /**
   * @memberof wwwRoot
   * @param {String} relativePath a path relative to {@link wwwRoot}
   * @returns {Promise<String>} a Promise resolving the contents of the file at `relativePath`
   *   or a blank String if the file is not present
   */
  async willLoadFile(relativePath) {
    const exists = await this.willDetectFile(relativePath);
    if (! exists) {
      return '';
    }

    // Promisify on-demand for mocking purposes
    const filepath = path.join(this.basePath, relativePath);
    const file = await Promise.promisify(fs.readFile, {
      context: fs,
    })(filepath, FS_READ_OPTIONS);

    return file;
  },

  /**
   * @memberof wwwRoot
   * @param {String} fileglob a path-and-glob-pattern relative to {@link wwwRoot}
   * @returns {Promise<Array>} a Promise resolving the filenames matching `fileglob`
   */
  async willGetFilenames(fileglob) {
    const pathglob = path.join(this.basePath, fileglob);

    // Promisify on-demand for mocking purposes
    const files = await Promise.promisify(glob)(pathglob);

    // just the filenames, please
    return files.map((file) => path.basename(file));
  },

  /**
   * @memberof wwwRoot
   * @param {String} relativePath a path relative to {@link wwwRoot}
   * @returns {Promise<Array>} a Promise resolving true if a file exists at `relativePath`
   */
  async willDetectFile(relativePath) {
    const filepath = path.join(this.basePath, relativePath);

    try {
      // Promisify on-demand for mocking purposes
      const stat = await Promise.promisify(fs.stat, {
        context: fs
      })(filepath);

      return stat.isFile();
    }
    catch (errThrown) {
      // traverse the cause chain, eg. `OperationalError`
      let err = errThrown;
      let cause;
      while (cause = err.cause) { // eslint-disable-line no-cond-assign
        err = cause;
      }

      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  },
};
