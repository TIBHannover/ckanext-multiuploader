# encoding: utf-8
'''Tests for the ckanext.multiuploader extension.

'''
import pytest

import ckan.tests.factories as factories
import ckan.lib.helpers as h
import ckan.model as model
import ckan.lib.create_test_data as ctd
#from pathlib import Path
#import base64
#import json



@pytest.mark.usefixtures('clean_db', 'with_plugins', 'with_request_context')
class TestUpload(object):
    sysadmin_user  = None
    resource_data = {}
    upload_url = None

    @pytest.fixture(autouse=True)
    def intial(self, clean_db, clean_index):
        ctd.CreateTestData.create()
        self.sysadmin_user = model.User.get("testsysadmin")
        self.resource_data = {
            'isLink': 0,            
            'save': 'go-metadata',
            'id': '',
            'description': 'Test Test',
        }
        self.upload_url = h.url_for('multiuploader.upload_resources')  



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
        self.resource_data['pck_id'] = dataset['id']                
        response = app.post(self.upload_url, data=self.resource_data)   
        assert response.status_code == 403
        assert "You need to authenticate before accessing this function" in response.body

    
    def test_resource_upload_admin_finish_button(self, app):
        '''An admin should be abled to
            call the backend and upload resource. 
            Add the resource to a draft dataset.
        '''
               
        owner_org = factories.Organization(users=[{
            'name': self.sysadmin_user.id,
            'capacity': 'member'
        }])
        dataset = factories.Dataset(owner_org=owner_org['id'])       
        #with open(Path(__file__).resolve().parent / 'resources' / 'test.jpg', 'rb') as test:
         #   img = test.read()
        self.resource_data['pck_id'] = dataset['id']                             
        auth = {u"Authorization": str(self.sysadmin_user.apikey)}
        response = app.post(self.upload_url, data=self.resource_data , extra_environ=auth)           
        assert response.status_code == 200
        assert "/dataset/" in response.body
    
    
    def test_resource_upload_validation(self, app):
        '''A resource upload request must 
            have the needed data. This test does not pass
            package id
        '''
               
        owner_org = factories.Organization(users=[{
            'name': self.sysadmin_user.id,
            'capacity': 'member'
        }])                                         
        auth = {u"Authorization": str(self.sysadmin_user.apikey)}
        response = app.post(self.upload_url, data=self.resource_data , extra_environ=auth)           
        assert response.status_code == 400
        assert "missing data" in response.body
    

    def test_resource_upload_admin_previous(self, app):
        '''Test the previous button in upload resource 
           page. It has to go back to the dataset edit page. 
        '''
               
        owner_org = factories.Organization(users=[{
            'name': self.sysadmin_user.id,
            'capacity': 'member'
        }])
        dataset = factories.Dataset(owner_org=owner_org['id'])       
        self.resource_data['save'] = "go-dataset"
        self.resource_data['pck_id'] = dataset['id']                             
        auth = {u"Authorization": str(self.sysadmin_user.apikey)}
        response = app.post(self.upload_url, data=self.resource_data , extra_environ=auth)           
        assert response.status_code == 200
        assert "/dataset/edit" in response.body
        
        
    def test_resource_upload_admin_add_button(self, app):
        '''An admin should be abled to
            call the backend and upload resource. 
            Add the resource to an existing dataset.
        '''
               
        owner_org = factories.Organization(users=[{
            'name': self.sysadmin_user.id,
            'capacity': 'member'
        }])
        dataset = factories.Dataset(owner_org=owner_org['id'])               
        self.resource_data['pck_id'] = dataset['id']
        self.resource_data['save'] = "go-dataset-complete"                             
        auth = {u"Authorization": str(self.sysadmin_user.apikey)}
        response = app.post(self.upload_url, data=self.resource_data , extra_environ=auth)           
        assert response.status_code == 200
        assert "/dataset/" in response.body
