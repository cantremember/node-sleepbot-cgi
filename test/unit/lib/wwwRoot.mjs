/* eslint max-nested-callbacks: [ 1, 5 ] */

import assert from 'assert';
import sinon from 'sinon';
import mockfs from 'mock-fs';
import fs from 'fs';
import path from 'path';

import wwwRoot from '../../../lib/wwwRoot.mjs';
import theLib from '../../../lib/index.mjs';
import theHelper from '../../helper.mjs';

// make sure header is on the 1st line
const TSV_CONTENT = `A\tB

1 \t2

 ä\t 🐝
`;


describe('lib/wwwRoot', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
    mockfs.restore();
    theHelper.mockConfig();

    theLib.forget();
  });


  describe('basePath', () => {
    it('overrides as expected', () => {
      assert.equal(wwwRoot.basePath, '/mock-fs');
    });
  });


  describe('willLoadTSV', () => {
    it('loads columns and trims the rows of a TSV by default', () => {
      mockfs({ '/mock-fs': {
        'test.tsv': TSV_CONTENT
      } });

      return wwwRoot.willLoadTSV('/test.tsv')
      .then((rows) => {
        assert.deepEqual(rows, [
          [ 1, 2 ],
          [ 'ä', '🐝' ],
        ]);
      });
    });

    it('handles quotes', () => {
      mockfs({ '/mock-fs': {
        // make sure header is on the 1st line
        'test.tsv': `A\tB
"1 multi
line"\t" 2 whitespace "
""\t"double""quote"
`      } });

      return wwwRoot.willLoadTSV('/test.tsv')
      .then((rows) => {
        assert.deepEqual(rows, [
          [ '1 multi\nline', ' 2 whitespace ' ],
          [ '', 'double"quote' ],
        ]);
      });
    });

    it('cannot handle comment lines', () => {
      mockfs({ '/mock-fs': {
        // make sure header is on the 1st line
        'test.tsv': `A\tB
1\t2
# Error: Number of columns is inconsistent on line 3
`
      } });

      return wwwRoot.willLoadTSV('/test.tsv')
      .then(theHelper.notCalled, (err) => {
        assert(err.message.match(/Invalid Record Length/));
      });
    });

    it('can take CSV parsing options', () => {
      mockfs({ '/mock-fs': {
        'test.tsv': TSV_CONTENT
      } });

      return wwwRoot.willLoadTSV('/test.tsv', {
        delimiter: ',', // CSV
      })
      .then((rows) => {
        assert.deepEqual(rows, [
          [ '1 \t2' ],
          [ 'ä\t 🐝' ]
        ]);
      });
    });

    it('loads nothing from an empty TSV', () => {
      mockfs({ '/mock-fs': {
        'test.tsv': ''
      } });

      return wwwRoot.willLoadTSV('/test.tsv')
      .then((rows) => {
        assert.deepEqual(rows, []);
      });
    });

    it('fails on a missing file', () => {
      mockfs({ '/mock-fs': { } });

      return wwwRoot.willLoadTSV('/test.tsv')
      .then(theHelper.notCalled, (err) => {
        assert(err.message.match(/ENOENT/));
      });
    });

    it('fails on a file-system Error', () => {
      sandbox.stub(fs, 'createReadStream').throws(new Error('BOOM'));

      return wwwRoot.willLoadTSV('/test.tsv')
      .then(theHelper.notCalled, (err) => {
        assert.equal(err.message, 'BOOM');
      });
    });
  });


  describe('willLoadLines', () => {
    it('loads lines from a file', () => {
      mockfs({ '/mock-fs': {
        'test.txt': `
line1

line2
`     } });

      return wwwRoot.willLoadLines('/test.txt')
      .then((rows) => {
        assert.deepEqual(rows, [
          // it('strips blank lines')
          'line1',
          'line2',
        ]);
      });
    });

    it('loads nothing from a missing file', () => {
      mockfs({ '/mock-fs': { } });

      return wwwRoot.willLoadLines('/test.txt')
      .then((content) => {
        assert.deepEqual(content, []);
      });
    });
  });


  describe('willLoadFile', () => {
    it('loads a file', () => {
      mockfs({ '/mock-fs': {
        'test.txt': ' whitespace preserved '
      } });

      return wwwRoot.willLoadFile('/test.txt')
      .then((content) => {
        assert.equal(content, ' whitespace preserved ');
      });
    });

    it('loads a Unicode buffer', () => {
      mockfs({ '/mock-fs': {
        'test.txt': Buffer.from([ 100, 101, 114, 112, 32, 0xE2, 0x99, 0xA5, 0xEF, 0xB8, 0x8F ])
      } });

      return wwwRoot.willLoadFile('/test.txt')
      .then((content) => {
        assert.equal(content, 'derp ♥️');
      });
    });

    it('loads nothing from an empty file', () => {
      mockfs({ '/mock-fs': {
        'test.txt': Buffer.alloc(0)
      } });

      return wwwRoot.willLoadFile('/test.txt')
      .then((content) => {
        assert.strictEqual(content, '');
      });
    });

    it('loads nothing from a missing file', () => {
      mockfs({ '/mock-fs': { } });

      return wwwRoot.willLoadFile('/test.txt')
      .then((content) => {
        assert.strictEqual(content, '');
      });
    });

    it('fails on a file-system Error', () => {
      mockfs({ '/mock-fs': { } });
      sandbox.stub(wwwRoot, 'willDetectFile').returns(
        Promise.resolve(true)
      );

      return wwwRoot.willLoadFile('/test.txt')
      .then(theHelper.notCalled, (err) => {
        assert(err.message.match(/ENOENT/));
      });
    });
  });


  describe('willGetFilenames', () => {
    it('returns filenames from a mock glob', () => {
      theHelper.mockGlob(sandbox, () => {
        return [ 'another.file', 'glob.file' ];
      });

      return wwwRoot.willGetFilenames(path.join('path', '*'))
      .then((filenames) => {
        assert.deepEqual(filenames, [
          'another.file',
          'glob.file',
        ]);
      });
    });

    it('returns filenames from a physical file-system', () => {
      // the path to the Node.js executable,
      //   `/usr/local/bin`, or whatever
      const { execPath } = process;
      const dirname = path.dirname(execPath);

      theHelper.mockConfig({ wwwRoot: dirname });

      return wwwRoot.willGetFilenames('*')
      .then((filenames) => {
        assert.ok(filenames.includes('node'));
        assert.ok(filenames.includes('npm'));

        // no directories
        return wwwRoot.willGetFilenames('.*');
      })
      .then((filenames) => {
        assert.deepEqual(filenames, []);
      });
    });

    it('returns nothing from a missing directory', () => {
      return wwwRoot.willGetFilenames('BOGUS/path/*')
      .then((filenames) => {
        assert.deepEqual(filenames, []);
      });
    });
  });


  describe('willDetectFile', () => {
    beforeEach(() => {
      mockfs({ '/mock-fs': {
        'file': Buffer.alloc(0),
        'subdir': { },
      } });
    });

    it('detects a file', () => {
      return wwwRoot.willDetectFile('/file')
      .then((exists) => {
        assert(exists);
      });
    });

    it('ignores a directory', () => {
      return wwwRoot.willDetectFile('/subdir')
      .then((exists) => {
        assert(! exists);
      });
    });

    it('ignores a missing file', () => {
      return wwwRoot.willDetectFile('/BOGUS')
      .then((exists) => {
        assert(! exists);
      });
    });

    it('fails on a file-system Error', () => {
      sandbox.stub(fs.Stats.prototype, 'isFile').throws(new Error('BOOM'));

      return wwwRoot.willLoadFile('/file')
      .then(theHelper.notCalled, (err) => {
        assert.equal(err.message, 'BOOM');
      });
    });
  });
});
