EXTENSION := multiuploader
CKAN_VERSION ?= 2.10
CKAN_IMAGE ?= 2.10-py3.10
SOLR_IMAGE ?= 2.10-solr8
COMPOSE := CKAN_VERSION=$(CKAN_VERSION) CKAN_IMAGE=$(CKAN_IMAGE) SOLR_IMAGE=$(SOLR_IMAGE) docker compose -f docker-compose.ci.yml -p ckanext-$(EXTENSION)-ci

.PHONY: lint up install db-init test test-coverage ci ci-coverage down bash

up:
	$(COMPOSE) up -d

# Runs inside the ckan container (no ruff/black required on the host) —
# no lint tooling is declared in requirements today, so this installs it
# on the fly rather than assuming it's already present.
lint: up
	$(COMPOSE) exec -T ckan sh -c 'pip install -q ruff black && ruff check . && black --check .'

install: up
	$(COMPOSE) exec -T ckan sh -c '\
		pip install -r requirements.txt && \
		pip install -r dev-requirements.txt && \
		pip install -e . && \
		sed -i -e "s|use = config:.*|use = config:/srv/app/src/ckan/test-core.ini|" test.ini \
	'

db-init: install
	$(COMPOSE) exec -T ckan ckan -c test.ini db init

# Runs against an already-provisioned environment (after `make db-init`) —
# use this for the fast inner loop once containers are up.
test:
	$(COMPOSE) exec -T ckan pytest --ckan-ini=test.ini --disable-warnings ckanext/$(EXTENSION)

test-coverage:
	$(COMPOSE) exec -T ckan pytest --ckan-ini=test.ini --cov=ckanext.$(EXTENSION) --cov-report=xml --cov-report=term-missing --disable-warnings ckanext/$(EXTENSION)
	$(COMPOSE) cp ckan:/srv/app/src_extensions/ckanext-$(EXTENSION)/coverage.xml ./coverage.xml

# Full gate: lint + fresh environment + tests + teardown. Use this locally
# before pushing and as the GitHub Actions entry point.
ci: lint db-init test down

ci-coverage: lint db-init test-coverage down

down:
	$(COMPOSE) down -v

bash: up
	$(COMPOSE) exec ckan bash
