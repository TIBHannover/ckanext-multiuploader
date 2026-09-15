[![CI](https://github.com/TIBHannover/ckanext-multiuploader/actions/workflows/test.yml/badge.svg)](https://github.com/TIBHannover/ckanext-multiuploader/actions/workflows/test.yml)

# ckanext-multiuploader

This CKAN extension helps users to upload multiple resources at once with drag&drop. 


## Requirements

Compatibility with core CKAN versions:

| CKAN version    | Compatible?   |
| --------------- | ------------- |
|  2.10 | version 2.0.0    | yes
|  2.9 | version 1.9.0   |
| earlier | Not tested |           |


## Installation

To install ckanext-multiuploader:

1. Activate your CKAN virtual environment and install:

         > . /usr/lib/ckan/default/bin/activate
         > pip install ckanext-multiuploader

 OR, Clone the source and install it on the virtualenv (Suggested location: /usr/lib/ckan/default/src)
:

        git clone https://github.com/TIBHannover/ckanext-multiuploader.git
        cd ckanext-multiuploader
        pip install -e .
        pip install -r requirements.txt

2. Add `multiuploader` to the `ckan.plugins` setting in your CKAN
   config file (by default the config file is located at
   `/etc/ckan/default/ckan.ini`).

3. Restart CKAN. For example if you've deployed CKAN with Apache on Ubuntu:

        sudo service apache2 reload

## Config

**Note**: you have to set the max resource size in ckan configuration (`/etc/ckan/default/ckan.ini`)

        ckan.max_resource_size

## Usage
### Add a dataset with the multiuploader user interface
```
Given an existing organization
When I add a dataset and enter required data in step 1 "Create Dataset"
And I click "Next: Add Data"
Then I should see the alternate user interface of "multiuploader" in the "Add data" tab
```

## Tests

### Using Docker (recommended)

No local CKAN installation is required — `make ci` provisions a disposable
CKAN + Solr + Postgres + Redis environment via Docker Compose (the same
images used in GitHub Actions CI), installs the extension into it, and
runs the test suite:

    make ci

Get a coverage report (written to `coverage.xml` in this directory, and
printed as a per-file summary in the terminal):

    make ci-coverage

Run lint (Black/ruff) only, without spinning up any containers:

    make lint

Other targets, useful for an interactive inner loop against an
already-running environment (`make up` first):

| Target | Description |
| --- | --- |
| `make up` | Start the CKAN/Solr/Postgres/Redis containers |
| `make install` | Install the extension and its requirements into the running `ckan` container |
| `make db-init` | Initialize the CKAN test database (implies `install`) |
| `make test` | Run the test suite against an already-provisioned environment |
| `make test-coverage` | Like `make test`, with coverage reporting |
| `make bash` | Open a shell in the running `ckan` container |
| `make down` | Stop and remove all containers and volumes |

CKAN/Solr version used by the containers can be overridden, e.g. to test
against a different CKAN release:

    make ci CKAN_VERSION=2.11 CKAN_IMAGE=2.11-py3.10 SOLR_IMAGE=2.11-solr9

### Without Docker

If you already have a CKAN development environment set up locally:

    pytest --ckan-ini=test.ini  --disable-pytest-warnings  ckanext/multiuploader/tests/
