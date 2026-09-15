"""Tests for the ckanext.multiuploader extension."""

import io
from typing import ClassVar

import ckan.lib.create_test_data as ctd
import ckan.lib.helpers as h
import pytest
from ckan.plugins import toolkit
from ckan.tests import factories

# from pathlib import Path
# import base64
# import json


@pytest.mark.usefixtures("clean_db", "with_plugins", "with_request_context")
class TestUpload:
    sysadmin_user = None
    resource_data: ClassVar[dict] = {}
    upload_url = None

    @pytest.fixture(autouse=True)
    def intial(self, clean_db, clean_index):
        ctd.CreateTestData.create()
        # self.sysadmin_user = model.User.get("testsysadmin")
        self.sysadmin_user = factories.Sysadmin()
        self.sysadmin_token = factories.APIToken(user=self.sysadmin_user["id"])
        self.sysadmin_token = self.sysadmin_token["token"]
        self.resource_data = {
            "isLink": 0,
            "save": "go-metadata",
            "id": "",
            "description": "Test Test",
        }
        self.upload_url = h.url_for("multiuploader.upload_resources")

    def test_resource_upload_guest_user(self, app):
        """A guest user should not be abled to
        call the backend and upload resource
        """
        user = factories.User()
        owner_org = factories.Organization(
            users=[{"name": user["id"], "capacity": "member"}]
        )
        dataset = factories.Dataset(owner_org=owner_org["id"])
        self.resource_data["pck_id"] = dataset["id"]
        response = app.post(self.upload_url, data=self.resource_data)
        assert response.status_code == 403
        assert (
            "You need to authenticate before accessing this function" in response.body
        )

    def test_resource_upload_admin_finish_button(self, app):
        """An admin should be abled to
        call the backend and upload resource.
        Add the resource to a draft dataset.
        """

        owner_org = factories.Organization(
            users=[{"name": self.sysadmin_user["id"], "capacity": "member"}]
        )
        dataset = factories.Dataset(owner_org=owner_org["id"])
        # with open(Path(__file__).resolve().parent / 'resources' / 'test.jpg', 'rb') as test:
        #   img = test.read()
        self.resource_data["pck_id"] = dataset["id"]
        auth = {"Authorization": self.sysadmin_token}
        response = app.post(
            self.upload_url, data=self.resource_data, extra_environ=auth
        )
        assert response.status_code == 200
        assert "/dataset/" in response.body

    def test_resource_upload_validation(self, app):
        """A resource upload request must
        have the needed data. This test does not pass
        package id
        """
        auth = {"Authorization": self.sysadmin_token}
        response = app.post(
            self.upload_url, data=self.resource_data, extra_environ=auth
        )
        assert response.status_code == 400
        assert "missing data" in response.body

    def test_resource_upload_admin_previous(self, app):
        """Test the previous button in upload resource
        page. It has to go back to the dataset edit page.
        """

        owner_org = factories.Organization(
            users=[{"name": self.sysadmin_user["id"], "capacity": "member"}]
        )
        dataset = factories.Dataset(owner_org=owner_org["id"])
        self.resource_data["save"] = "go-dataset"
        self.resource_data["pck_id"] = dataset["id"]
        auth = {"Authorization": self.sysadmin_token}
        response = app.post(
            self.upload_url, data=self.resource_data, extra_environ=auth
        )
        assert response.status_code == 200
        assert "/dataset/edit" in response.body

    def test_resource_upload_admin_add_button(self, app):
        """An admin should be abled to
        call the backend and upload resource.
        Add the resource to an existing dataset.
        """

        owner_org = factories.Organization(
            users=[{"name": self.sysadmin_user["id"], "capacity": "member"}]
        )
        dataset = factories.Dataset(owner_org=owner_org["id"])
        self.resource_data["pck_id"] = dataset["id"]
        self.resource_data["save"] = "go-dataset-complete"
        auth = {"Authorization": self.sysadmin_token}
        response = app.post(
            self.upload_url, data=self.resource_data, extra_environ=auth
        )
        assert response.status_code == 200
        assert "/dataset/" in response.body

    def test_resource_upload_link(self, app):
        """isLink=1 must create the resource as a link
        (url_type='') using the given url and name, add it
        to the package, and mark the package active on the
        draft-finish path.
        """

        owner_org = factories.Organization(
            users=[{"name": self.sysadmin_user["id"], "capacity": "member"}]
        )
        dataset = factories.Dataset(owner_org=owner_org["id"], state="draft")
        self.resource_data["pck_id"] = dataset["id"]
        self.resource_data["isLink"] = 1
        self.resource_data["url"] = "https://example.com/data.csv"
        self.resource_data["name"] = "data.csv"
        auth = {"Authorization": self.sysadmin_token}
        response = app.post(
            self.upload_url, data=self.resource_data, extra_environ=auth
        )
        assert response.status_code == 200

        package = toolkit.get_action("package_show")(
            {"ignore_auth": True}, {"name_or_id": dataset["id"]}
        )
        assert package["state"] == "active"
        assert len(package["resources"]) == 1
        resource = package["resources"][0]
        assert resource["url_type"] == ""
        assert resource["url"] == "https://example.com/data.csv"
        assert resource["name"] == "data.csv"

    def test_resource_upload_file(self, app):
        """isLink=0 with files in the request must create the
        resource(s) as uploads (url_type='upload'), add them
        to the package, and mark the package active on the
        draft-finish path.
        """

        owner_org = factories.Organization(
            users=[{"name": self.sysadmin_user["id"], "capacity": "member"}]
        )
        dataset = factories.Dataset(owner_org=owner_org["id"], state="draft")
        self.resource_data["pck_id"] = dataset["id"]
        self.resource_data["isLink"] = 0
        self.resource_data["files"] = [
            (io.BytesIO(b"col1,col2\n1,2\n"), "first.csv"),
            (io.BytesIO(b"hello world"), "second.txt"),
        ]
        auth = {"Authorization": self.sysadmin_token}
        response = app.post(
            self.upload_url,
            data=self.resource_data,
            extra_environ=auth,
            content_type="multipart/form-data",
        )
        assert response.status_code == 200

        package = toolkit.get_action("package_show")(
            {"ignore_auth": True}, {"name_or_id": dataset["id"]}
        )
        assert package["state"] == "active"
        assert len(package["resources"]) == 2
        names = {resource["name"] for resource in package["resources"]}
        assert names == {"first.csv", "second.txt"}
        for resource in package["resources"]:
            assert resource["url_type"] == "upload"
