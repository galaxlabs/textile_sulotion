// Copyright (c) 2026, Galaxy labs and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Teamwear Pricing Rule", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on("Teamwear Pricing Rule", {
  refresh(frm) {
    if (!frm.is_new() && frappe.user.has_role("System Manager")) {
      frm.add_custom_button(__("Generate / Update Price Matrix"), () => {
        frappe.call({
          method: "textile_sulotion.textile_sulotion.utils.teamwear_price_matrix.generate_teamwear_price_matrix",
          args: { update_existing: 1 },
          freeze: true,
          freeze_message: __("Generating / Updating Teamwear Price Matrix..."),
          callback(r) {
            if (!r.exc) {
              frappe.msgprint(r.message || __("Done"));
            }
          }
        });
      }, __("Actions"));
    }
  }
});
