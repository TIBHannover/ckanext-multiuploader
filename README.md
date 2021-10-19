# ckanext-multiuploader

This CKAN extension helps users to upload multiple resources at once with drag&drop. 


## Screenshots

![mu1](https://user-images.githubusercontent.com/16546640/137907722-4757b272-8959-428f-9033-fb4d58587dae.png)
----------------------
![mu2](https://user-images.githubusercontent.com/16546640/137907804-5c49aeb6-8c79-48b9-a7ab-99812b7e519d.png)
----------------------
![mu3](https://user-images.githubusercontent.com/16546640/137907849-c49a5fb5-ccec-46a4-9023-e318fd3c4599.png)


## Requirements

Compatibility with core CKAN versions:

| CKAN version    | Compatible?   |
| --------------- | ------------- |
|  2.9 | Yes    |
| earlier | No |           |


## Installation

To install ckanext-multiuploader:

1. Activate your CKAN virtual environment, for example:

     . /usr/lib/ckan/default/bin/activate

2. Clone the source and install it on the virtualenv (Suggested location: /usr/lib/ckan/default/src)
:

        git clone https://github.com/TIBHannover/ckanext-multiuploader.git
        cd ckanext-multiuploader
        pip install -e .
        pip install -r requirements.txt

3. Add `multiuploader` to the `ckan.plugins` setting in your CKAN
   config file (by default the config file is located at
   `/etc/ckan/default/ckan.ini`).

4. Restart CKAN. For example if you've deployed CKAN with Apache on Ubuntu:

        sudo service apache2 reload


## Usage and Config

**Note**: you have to set the max resource size in ckan configuration (`/etc/ckan/default/ckan.ini`)

        ckan.max_resource_size



## Tests

To run the tests, do:

    pytest --ckan-ini=test.ini  --disable-pytest-warnings  ckanext/multiuploader/tests/
