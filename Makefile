SHELL = /bin/bash
ROOT = $(shell pwd)
REPO_URL = git@github.com:cantremember/node-sleepbot-cgi.git

ES5 = $(ROOT)/build/es5
NODE_BIN = $(ROOT)/node_modules/.bin
COVERAGE_INFO = $(ROOT)/build/coverage/lcov.info

JS_DIRS = app/ app.js config/ gulpfile.js index.js lib/ test/ views/
JS_STAGED = $(git diff --cached --name-only --diff-filter=ACM | grep ".js$")


# colors
#   http://www.csc.uvic.ca/~sae/seng265/fall04/tips/s265s047-tips/bash-using-colors.html
C_INFO=\033[1;97;44m
C_OK=\033[1;97;42m
C_ERR=\033[1;97;41m
C_WARN=\033[1;97;43m
C_CLOSE=\033[0m

E_INFO=echo -e "$(C_INFO) INFO $(C_CLOSE) $(1)"
E_OK=echo -e "$(C_OK)  OK  $(C_CLOSE) $(1)"
E_ERR=echo -e "$(C_ERR) FAIL $(C_CLOSE) $(1)"
E_WARN=echo -e "$(C_WARN) WARN $(C_CLOSE) $(1)"

CODE_FILE=/tmp/make.code
CODE_OK=echo 0 > $(CODE_FILE)
CODE_FAIL=echo $$? > $(CODE_FILE)
CODE_GET=cat $(CODE_FILE)


.PHONY: build style clean init

.DEFAULT_GOAL: build

build:  style lint compile

init:
	@mkdir -p build


clean:  init
	@$(NODE_BIN)/gulp clean

compile:  init
	@$(NODE_BIN)/gulp compile

run-dev:  init
	BLUEBIRD_DEBUG=1 NODE_ENV=dev node $(ES5)/app.js

run-watch:  init
	$(NODE_BIN)/gulp watch

# https://github.com/jshint/jshint
#   http://jshint.com/docs/options/
# https://github.com/eslint/eslint
#   http://eslint.org/docs/user-guide/configuring
#   http://eslint.org/docs/rules/
lint:  init
	@$(NODE_BIN)/jshint --config .jshintrc $(JS_DIRS) \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"failed to lint"); exit 1; \
	else \
		$(call E_OK,"it has linted!"); \
	fi

# https://github.com/jscs-dev/node-jscs
#   http://jscs.info/rules.html
style:  init
	@$(NODE_BIN)/jscs --esnext --config .jscs.json $(JS_DIRS) \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"poor style"); exit 1; \
	else \
		$(call E_OK,"has the style!"); \
	fi

test:  init
	BLUEBIRD_DEBUG=1 NODE_ENV=test $(NODE_BIN)/mocha $(ES5)/test \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"Test Suite failed"); exit 1; \
	else \
		$(call E_OK,"Test Suite passed!"); \
	fi

test-debug:  init
	BLUEBIRD_DEBUG=1 NODE_ENV=test $(NODE_BIN)/mocha debug $(ES5)/test


# https://github.com/gotwarlost/istanbul#configuring
#   `istanbul help`
#   .istanbul.yml
#   /* istanbul ignore if */
#   /* istanbul ignore else */
#   /* istanbul ignore next */
coverage:  compile
	@# uses `_mocha`, unlike `npm test`
	@NODE_ENV=test $(NODE_BIN)/istanbul cover $(NODE_BIN)/_mocha $(ES5)/test -- --reporter nyan
	@$(NODE_BIN)/istanbul report
	@$(NODE_BIN)/istanbul check-coverage \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"failed to achieve coverage"); exit 1; \
	else \
		$(call E_OK,"coverage achieved!"); \
	fi

# https://github.com/cainus/node-coveralls
# FIXME:  Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
#   we are not gonna make CI success dependent upon Coveralls.io
#   CODE=$?
ci:  compile
	@rm -f $(COVERAGE_INFO)

	@# uses `_mocha`, unlike `npm test`
	@NODE_ENV=test $(NODE_BIN)/istanbul cover $(NODE_BIN)/_mocha $(ES5)/test -- --reporter dot

	cat $(COVERAGE_INFO) | $(NODE_BIN)/coveralls || \
		$(call E_WARN,"Coveralls.io failure ignored")
	@$(call E_OK,"CI passed!")


# https://github.com/jsdoc3/jsdoc
#   http://usejsdoc.org/
#   "jsdoc": "3.3.0-beta1"
#   .jsdoc.json
doc:  compile
	@$(NODE_BIN)/jsdoc -c $(ROOT)/.jsdoc.json \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"failed to build doc"); exit 1; \
	else \
		$(call E_OK,"doc built!"); \
	fi

# https://help.github.com/articles/creating-project-pages-manually/
#   ```bash
#   git clone git@github.com:cantremember/node-sleepbot-cgi.git gh-pages
#   cd gh-pages/
#   git checkout --orphan gh-pages
#   git rm -rf .
#   # ...
#   git push -u origin gh-pages
#   ```
gh-pages:  init
	@rm -rf build/gh-pages
	@git clone -b gh-pages $(REPO_URL) build/gh-pages
	@$(NODE_BIN)/jsdoc -c $(ROOT)/.jsdoc.json --destination build/gh-pages

	@cd build/gh-pages && \
		git diff --name-only --diff-filter=ACM | \
		wc -l | \
		tr -d '[[:space:]]' > \
		$(CODE_FILE)

	echo `$(CODE_GET)`

	@if [[ "`$(CODE_GET)`" == "0" ]]; then \
		$(call E_INFO,"gh-pages did not change"); \
	else \
		cd build/gh-pages && \
		    git add . && \
			git commit --no-verify -m "gh-pages updated `date '+%Y-%d-%m %H:%M:%S'`" && \
			git push; \
		$(call E_OK,"gh-pages updated!"); \
	fi

	@rm -rf build/gh-pages


# `npm run-script`

post-install:  init
	@# ensure Git directory
	@if [[ -d $(ROOT)/.git ]]; then \
	    $(call E_INFO,"ensuring .git/hooks"); \
	    mkdir -p $(ROOT)/.git/hooks; \
		\
	    $(call E_INFO,"installing .git/hooks"); \
	    echo -e "#!/bin/bash\nmake pre-commit" > $(ROOT)/.git/hooks/pre-commit; \
	    chmod 755 $(ROOT)/.git/hooks/pre-commit; \
	fi

	@# initial compilation
	$(MAKE) compile


# https://git-scm.com/docs/githooks

pre-commit:  init
	@if [[ "$(JS_STAGED)" == "" ]]; then \
	    $(call E_INFO,"no JavaScript changes"); \
	fi

	@# work from source
	@$(MAKE) only-check lint style

	@# work from compiled
	@$(MAKE) compile test

only-check:
	@git grep -Eq '\.only\(' -- test \
		&& $(CODE_OK) || $(CODE_FAIL)

	@# inverted logic; no find = success
	@if [[ "`$(CODE_GET)`" == "0" ]]; then \
		$(call E_ERR,"please remove '.only' calls from the Test Suite"); exit 1; \
	fi
