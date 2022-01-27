# ckanext-multiuploader

This CKAN extension helps users to upload multiple resources at once with drag&drop. 


## Requirements

Compatibility with core CKAN versions:

| CKAN version    | Compatible?   |
| --------------- | ------------- |
|  2.9 | Yes    |
| earlier | No |           |


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


## Usage and Config

**Note**: you have to set the max resource size in ckan configuration (`/etc/ckan/default/ckan.ini`)

        ckan.max_resource_size



## Tests

To run the tests, do:

    pytest --ckan-ini=test.ini  --disable-pytest-warnings  ckanext/multiuploader/tests/
