"""Focused regressions for the remaining PR #6 compatibility fixes."""

import logging
from unittest.mock import Mock

import pytest
from ckan.plugins import toolkit
from flask import Flask
from flask.sessions import SecureCookieSessionInterface
from werkzeug.exceptions import Forbidden

from ckanext.multiuploader.controllers import UploadController
from ckanext.multiuploader.lib import Helper


@pytest.mark.usefixtures("with_plugins")
def test_multiuploader_asset_include_without_unknown_assets(app, caplog):
    from ckan.lib.webassets_tools import include_asset

    caplog.set_level(logging.ERROR, logger="ckan.lib.webassets_tools")

    with app.flask_app.test_request_context("/"):
        include_asset("ckanext-multiuploader/my-js")

    assert "Trying to include unknown asset" not in caplog.text


@pytest.mark.parametrize(
    "configured, name, expected",
    [
        (None, "multiuploader", False),
        ([], "multiuploader", False),
        (["multiuploader"], "multiuploader", True),
        ("multiuploader datastore", "multiuploader", True),
        ("multiuploader_extra datastore", "multiuploader", False),
        ("multiuploader\n datastore", "datastore", True),
    ],
)
def test_plugin_enabled(monkeypatch, configured, name, expected):
    monkeypatch.setitem(toolkit.config, "ckan.plugins", configured)
    assert Helper.check_plugin_enabled(name) is expected


@pytest.mark.parametrize(
    "configured, expected",
    [
        (None, False),
        ("multiuploader", False),
        ("multiuploader cancel_dataset_creation", True),
        (["multiuploader", "cancel_dataset_creation"], True),
    ],
)
def test_cancel_dataset_plugin_is_enabled(monkeypatch, configured, expected):
    monkeypatch.setitem(toolkit.config, "ckan.plugins", configured)
    assert UploadController.cancel_dataset_plugin_is_enabled() is expected


@pytest.mark.parametrize(
    "max_size, expected",
    [
        (None, "unknown"),
        ("", "unknown"),
        ("5000", "5"),
        (10000, "10"),
        ("500", "0.5"),
        (250, "0.25"),
    ],
)
def test_get_upload_limit(monkeypatch, max_size, expected):
    if max_size is None:
        monkeypatch.delitem(toolkit.config, "ckan.max_resource_size", raising=False)
    else:
        monkeypatch.setitem(toolkit.config, "ckan.max_resource_size", max_size)
    assert UploadController.get_upload_limit() == expected


@pytest.mark.parametrize(
    "root_path, expected",
    [
        (None, "1368"),
        ("/default/ckan/{{LANG}}", "1368"),
        ("/sfb1368/ckan/{{LANG}}", "1368"),
        ("/sfb1153/ckan/{{LANG}}", "1153"),
    ],
)
def test_which_sfb_multiuploader(monkeypatch, root_path, expected):
    if root_path is None:
        monkeypatch.delitem(toolkit.config, "ckan.root_path", raising=False)
    else:
        monkeypatch.setitem(toolkit.config, "ckan.root_path", root_path)
    assert UploadController.which_sfb_multiuploader() == expected


@pytest.mark.parametrize(
    "filenames", [None, "", "first.csv,second.csv", ["first,part.csv", "second.csv"]]
)
def test_delete_exact_filenames(monkeypatch, filenames):
    resources = [
        {"id": name, "name": name}
        for name in [
            "first.csv",
            "second.csv",
            "first",
            "csv",
            "other.csv",
            "first,part.csv",
        ]
    ]
    delete = Mock()
    show = Mock(return_value={"resources": resources})
    monkeypatch.setattr(
        toolkit,
        "get_action",
        {"package_show": show, "resource_delete": delete}.__getitem__,
    )
    data = {"pck_id": "dataset"}
    if filenames is not None:
        data["filenames[]" if isinstance(filenames, list) else "filenames"] = filenames
    with Flask(__name__).test_request_context(method="POST", data=data):
        toolkit.g.user = "tester"
        assert UploadController.delete_uploaded_resources() == "True"
    expected = ["first.csv", "second.csv"] if filenames else []
    if isinstance(filenames, list):
        expected = filenames
    assert {call.args[1]["id"] for call in delete.call_args_list} == set(expected)


def test_delete_requires_authentication(monkeypatch):
    get_action = Mock()
    monkeypatch.setattr(toolkit, "get_action", get_action)
    flask_app = Flask(__name__)
    flask_app.secret_key = "test-secret"
    with flask_app.test_request_context(method="POST"):
        toolkit.g.user = None
        with pytest.raises(Forbidden):
            UploadController.delete_uploaded_resources()
    get_action.assert_not_called()


@pytest.mark.usefixtures("with_plugins")
def test_resource_form_renders(app, monkeypatch):
    from ckan.lib import helpers

    monkeypatch.setitem(
        helpers.helper_functions, "check_access", lambda *args, **kwargs: True
    )

    monkeypatch.setitem(app.flask_app.config, "SECRET_KEY", "test-secret")
    monkeypatch.setattr(
        app.flask_app, "session_interface", SecureCookieSessionInterface()
    )
    with app.flask_app.test_request_context():
        toolkit.g.csrf_field_name = "_csrf_token"
        toolkit.g.user = None
        html = helpers.snippet(
            "snippets/new_resource_form.html",
            pkg_name="test-dataset",
            dataset_type="dataset",
            data={"id": "test-resource"},
            errors={},
            error_summary={},
        )
    assert "progress-modal" in html
    assert 'aria-valuemin="0"' in html
    assert 'data-bs-dismiss="modal"' in html
    assert "/dataset/test-dataset/resource/test-resource/delete" in html
