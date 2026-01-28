frappe.listview_settings["Teamwear Pricing Rule"] = {
  onload(listview) {
    if (frappe.user.has_role("System Manager")) {
      listview.page.add_menu_item(__("Generate / Update Price Matrix"), () => {
        frappe.call({
          method: "textile_sulotion.textile_sulotion.utils.teamwear_price_matrix.generate_teamwear_price_matrix",
          args: { update_existing: 1 },
          freeze: true,
          freeze_message: __("Generating / Updating Teamwear Price Matrix..."),
          callback(r) {
            if (!r.exc) {
              frappe.msgprint(r.message || __("Done"));
              listview.refresh();
            }
          }
        });
      });
    }
  }
};
