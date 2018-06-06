SHELL = /bin/bash
ROOT = $(shell pwd)
REPO_URL = git@github.com:cantremember/node-sleepbot-cgi.git

NODE_BIN = $(ROOT)/node_modules/.bin
COVERAGE_INFO = $(ROOT)/build/coverage/lcov.info
COVERAGE_REPORT = $(ROOT)/build/coverage/lcov-report/index.html
DOC_DIR = $(ROOT)/build/doc

# also
#   @see package.json + `nyc.include`
#   @see bin/gulp.js
JS_FILES = gulpfile.js index.js index.mjs
JS_DIRS = app/ bin/ config/ lib/ test/ views/
JS_STAGED = $(git diff --cached --name-only --diff-filter=ACM | egrep "\.(js|mjs)$")

TEST_FILES = $(ROOT)/test/bootstrap.mjs \
	$(ROOT)/test/**/*.js $(ROOT)/test/**/*.mjs \
	$(ROOT)/test/**/**/*.js $(ROOT)/test/**/**/*.mjs


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


.PHONY: \
	init clean build lock edit \
	server server-debug server-production \
	test test-debug \
	lint notes only-check coverage view-coverage \
	quality ci \
	doc view-doc  gh-pages \
	post-install pre-commit \

.DEFAULT_GOAL: test


# Build steps

init:
	@mkdir -p build

clean:
	@$(NODE_BIN)/gulp clean

build:  init
	@# no build steps, currently

lock:
	@npm install --package-lock-only

edit:
	@subl node-sleepbot-cgi.sublime-project


# Run the thing

server:
	@BLUEBIRD_DEBUG=1 node -r esm $(ROOT)/bin/app.mjs

server-debug:
	@BLUEBIRD_DEBUG=1 node debug -r esm $(ROOT)/bin/app.mjs


# Test Suite
#   leaving this as `mocha` shell scripting via Make, vs. `gulp-mocha`
#   because it's a pain to enable a debugger REPL in a Gulp Task
#   `gulp debug` => "Task never defined: debug", etc.
test:
	@BLUEBIRD_DEBUG=1 NODE_ENV=test $(NODE_BIN)/mocha \
		-r esm \
		--recursive --ui bdd --reporter spec --timeout 2000 \
		$(TEST_FILES) \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"Test Suite failed"); exit 1; \
	else \
		$(call E_OK,"Test Suite passed!"); \
	fi

test-debug:
	@BLUEBIRD_DEBUG=1 NODE_ENV=test $(NODE_BIN)/mocha debug \
		-r esm \
		--recursive --ui bdd --reporter spec --timeout 2000 \
		$(TEST_FILES)


# Code Quality Tasks

lint:
	@$(NODE_BIN)/gulp lint \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"Lint failed"); exit 1; \
	else \
		$(call E_OK,"Lint passed!"); \
	fi

# https://github.com/stephenb/node-notes
notes:
	@$(NODE_BIN)/notes $(JS_FILES) $(JS_DIRS)

# leftover Mocha `describe.only`s, etc.
only-check:
	@git grep -E '\.only\(' -- test \
		&& $(CODE_OK) || $(CODE_FAIL)

	@# inverted logic; no find = success
	@if [[ "`$(CODE_GET)`" == "0" ]]; then \
		$(call E_ERR,"please remove '.only' calls from the Test Suite"); exit 1; \
	fi

# https://github.com/istanbuljs/nyc
#   https://github.com/istanbuljs/istanbuljs
#   `nyc help`
#   https://github.com/istanbuljs/nyc#configuring-nyc
#   package.json + `nyc`
# inlines
#   /* istanbul ignore if */
#   /* istanbul ignore else */
#   /* istanbul ignore next */
#   /* istanbul ignore file */
# TODO:  Gulp task
#	current `gulp-istanbul` is for 1.0, https://github.com/gotwarlost/istanbul
coverage:
	@NODE_ENV=test $(NODE_BIN)/nyc \
		$(MAKE) test
	@$(NODE_BIN)/nyc check-coverage \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"Coverage failed"); exit 1; \
	else \
		$(call E_OK,"Coverage passed!"); \
	fi

view-coverage:
	open $(COVERAGE_REPORT)


# Code Quality Aggregations

# (1) from source
# (2) from build
quality:  only-check lint  build coverage

# https://github.com/cainus/node-coveralls
#   https://istanbul.js.org/docs/tutorials/mocha/
#   "Integrating with Coveralls"
# environment
#   COVERALLS_SERVICE_NAME  # eg. 'travis-ci', 'local'
#   COVERALLS_REPO_TOKEN    # from https://coveralls.io/github/cantremember/node-sleepbot-cgi/settings
# FIXME:  Bad response: 422 {"message":"Couldn't find a repository matching this job.","error":true}
#   on local / non Travis-CI builds
#   we are not gonna make CI success dependent upon Coveralls.io
#   CODE=$?
#
ci:  only-check lint  clean build coverage
	@cat $(COVERAGE_INFO) | $(NODE_BIN)/coveralls || \
		$(call E_WARN,"Coveralls.io failure ignored")
	@$(call E_OK,"CI passed!")


# Documentation

doc:  build
	@$(NODE_BIN)/gulp doc \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"failed to build doc"); exit 1; \
	else \
		$(call E_OK,"doc built!"); \
	fi

view-doc:
	open $(DOC_DIR)/index.html


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

	@$(MAKE) doc
	@cp -r $(DOC_DIR)/*  build/gh-pages

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


# `npm run <TARGET>`

post-install:
	@# ensure Git directory
	@if [[ -d $(ROOT)/.git ]]; then \
	    $(call E_INFO,"ensuring .git/hooks"); \
	    mkdir -p $(ROOT)/.git/hooks; \
		\
	    $(call E_INFO,"installing .git/hooks"); \
	    echo -e "#!/bin/bash\nmake pre-commit" > $(ROOT)/.git/hooks/pre-commit; \
	    chmod 755 $(ROOT)/.git/hooks/pre-commit; \
	fi

	@# initial build
	$(MAKE) build


# https://git-scm.com/docs/githooks

pre-commit:
	@if [[ "$(JS_STAGED)" == "" ]]; then \
	    $(call E_INFO,"no JavaScript changes"); \
	else \
		$(MAKE) quality; \
	fi
