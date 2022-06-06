SHELL = /bin/bash
ROOT = $(shell pwd)
REPO_URL = git@github.com:cantremember/node-sleepbot-cgi.git

NODE_BIN = $(ROOT)/node_modules/.bin
COVERAGE_INFO = $(ROOT)/build/coverage/lcov.info
COVERAGE_REPORT = $(ROOT)/build/coverage/lcov-report/index.html
DOC_DIR = $(ROOT)/build/doc

# i would rather 'gulp.mjs' wasn't in the root,
#   but i am not in a mood to fight with 'bin/gulp.mjs' relative directory nonsense
GULP_EXEC = $(NODE_BIN)/gulp --gulpfile gulp.mjs

# yes, technically `JS_` lists '.mjs' files now
#   and in reality, we ignore the '*.js' extension entirely
#   it's all about ESModules & '*.json' now
# also
#   @see package.json + `nyc.include`
#   @see gulp.mjs
JS_FILES = *.mjs
JS_DIRS = app/ bin/ config/ lib/ test/ views/
#   that ')$"' combo at the end is critical to avoiding a world of pain
JS_STAGED = $(git diff --cached --name-only --diff-filter=ACM | egrep "\.(mjs)$")

TEST_FILES = \
	$(ROOT)/test/bootstrap.mjs \
	$(ROOT)/test/**/*.mjs \
	$(ROOT)/test/**/**/*.mjs


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
	install \
	init clean build lock edit \
	server server-debug server-repl \
	test test-debug \
	lint notes only-check coverage view-coverage \
	quality ci \
	doc view-doc  gh-pages \
	post-install pre-commit \

.DEFAULT_GOAL: test


# Build steps

# https://github.com/npm/npm/issues/3497
#   npm postinstall "npm WARN cannot run in wd"
#   because sudo
install:
	@npm install --unsafe-perm

init:
	@mkdir -p build

clean:
	@$(GULP_EXEC) clean

build:  init
	@# no build steps, currently

lock:
	@npm install --package-lock-only


# Run the thing

server:
	@# --httpPort=3000
	@node  $(ROOT)/bin/app.mjs

server-repl:
	@node inspect  $(ROOT)/bin/app.mjs

server-debug:
	@node --inspect=localhost:9229  $(ROOT)/bin/app.mjs

server-debug-remote:
	ssh -N -T -L 9229:localhost:9229 sleepbot.com


# Test Suite
#   leaving this as `mocha` shell scripting via Make, vs. `gulp-mocha`
#   because it's a pain to enable a debugger REPL in a Gulp Task
#   `gulp debug` => "Task never defined: debug", etc.
test:
	@NODE_ENV=test $(NODE_BIN)/mocha \
		--recursive --ui bdd --reporter spec --timeout 2000 \
		$(TEST_FILES) \
		&& $(CODE_OK) || $(CODE_FAIL)

	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
		$(call E_ERR,"Test Suite failed"); exit 1; \
	else \
		$(call E_OK,"Test Suite passed!"); \
	fi

test-debug:
	@NODE_ENV=test  node inspect  $(NODE_BIN)/mocha \
		--recursive --ui bdd --reporter spec --timeout 2000 \
		$(TEST_FILES)


# Code Quality Tasks

lint:
	@$(GULP_EXEC) lint \
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
# TODO:  restore Coverage support
#   ES Modules don't use `require` :(
#   [todo: figure out how to instrument .mjs files](https://github.com/istanbuljs/nyc/issues/659)
#   [NYC style code coverage](https://github.com/nodejs/node/issues/42243)
coverage:  test

# coverage:
# 	@NODE_ENV=test $(NODE_BIN)/nyc \
# 		$(MAKE) test
# 	@$(NODE_BIN)/nyc check-coverage \
# 		&& $(CODE_OK) || $(CODE_FAIL)
#
# 	@if [[ "`$(CODE_GET)`" != "0" ]]; then \
# 		$(call E_ERR,"Coverage failed"); exit 1; \
# 	else \
# 		$(call E_OK,"Coverage passed!"); \
# 	fi

view-coverage:
	open $(COVERAGE_REPORT)


# Code Quality Aggregations

# (1) from source
# (2) from build
quality:  only-check lint  build coverage

ci:  only-check lint  clean build coverage


# Documentation

doc:  build
	$(GULP_EXEC) doc \
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

view-gh-pages:
	@open http://cantremember.github.io/node-sleepbot-cgi/


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
