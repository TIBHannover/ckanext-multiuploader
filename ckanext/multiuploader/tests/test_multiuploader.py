# encoding: utf-8
'''Tests for the ckanext.multiuploader extension.

'''
from requests.models import Response
from werkzeug.datastructures import Headers
import pytest

import ckan.logic as logic
import ckan.tests.factories as factories
import ckan.tests.helpers as helpers
import ckan.lib.helpers as h
from ckan.plugins.toolkit import NotAuthorized, ObjectNotFound
import json, requests, io


@pytest.mark.usefixtures('clean_db', 'with_plugins', 'with_request_context')
class TestUpload(object):
    def test_resource_upload_guest_user(self, app):
        '''A guest user should not be abled to
            call the backend and upload resource
        '''
        user = factories.User()
        owner_org = factories.Organization(users=[{
            'name': user['id'],
            'capacity': 'member'
        }])
        dataset = factories.Dataset(owner_org=owner_org['id'])       

        data = {
            'isLink': 0,
            'pck_id': dataset['id'],
            'save': 'go-metadata',
            'id': '',
            'description': 'Test Test',
            'files':(io.BytesIO(b"abcdef"), 'test.jpg')
        }
        url = h.url_for('multiuploader.upload_resources')        
        headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36'}
        headers={'content_type':'multipart/form-data'}  
        response = app.post(url, data=data, headers=headers)   

        assert response.status_code == 403
        
        
