from ckan.plugins import toolkit


class Helper:

    def add_resource(package_name, request, active, isLink):
        package = toolkit.get_action("package_show")({}, {"name_or_id": package_name})
        description = request.form["description"]
        context = {}
        if isLink == 1:  # resource is a link not file
            resource_data = {
                "package_id": package["id"],
                "url": request.form["url"],
                "description": description,
                "name": request.form["name"],
                "url_type": "",
            }
            toolkit.get_action("resource_create")(context, resource_data)
            if active:
                package = toolkit.get_action("package_show")(
                    context, {"name_or_id": package_name}
                )
                package["state"] = "active"
                toolkit.get_action("package_update")(context, package)
            return True

        for resource in request.files.getlist("files"):
            resource_data = {
                "package_id": package["id"],
                "url": resource.filename,
                "description": description,
                "name": resource.filename,
                "url_type": "upload",
                "upload": resource,
            }
            toolkit.get_action("resource_create")(context, resource_data)

        if active:
            package = toolkit.get_action("package_show")(
                context, {"name_or_id": package_name}
            )
            package["state"] = "active"
            toolkit.get_action("package_update")(context, package)

        return True

    def check_plugin_enabled(plugin_name):
        plugins = toolkit.config.get("ckan.plugins")
        return plugin_name in plugins
