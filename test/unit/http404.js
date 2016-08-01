const assert = require('assert');
const sinon = require('sinon');
// TODO:  node-mocks-http@^1.5.2, once Request#render(cb)
const httpMocks = require('@cantremember/node-mocks-http');

const theHelper = require('../helper');
const willHandle = require('../../app/http404');


describe('http404', () => {
    let sandbox;
    let cb;
    let req;
    let res;

    beforeEach(() => {
        // own own private sandbox
        sandbox = sinon.sandbox.create();
        cb = sandbox.spy();

        // mock Request & Response
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
    });
    afterEach(() => {
        sandbox.restore();
    });


    it('will render its page', () => {
        return willHandle(req, res, cb)
        .then(() => {
            assert(! cb.called);

            assert.equal(res._getRenderView(), 'http404.ejs');
            assert.equal(res._getData(), 'http404.ejs');
            assert.equal(res.statusCode, 200);
        });
    });

    it('will fail gracefully', () => {
        sandbox.stub(res, 'render').throws(new Error('BOOM'));
        sandbox.spy(res, 'send');

        willHandle(req, res, cb)
        .then(theHelper.notCalled, (err) => {
            assert.equal('BOOM', err.message);

            assert(res.render.calledOnce);
            assert(! res.send.called);

            // Express gets informed
            assert(cb.called);
            assert.strictEqual(cb.args[0][0], err);
        });
    });
});
