// Copyright (c) 2025, Galaxy labs and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Teamwear Price Matrix", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on('Teamwear Price Matrix', {
  refresh(frm) {
    if (frappe.user.has_role('System Manager')) {
      frm.add_custom_button(__('Generate Default Matrix'), function () {
        frappe.call({
          method: "textile_sulotion.textile_sulotion.utils.teamwear_price_matrix.generate_teamwear_price_matrix"
          freeze: true,
          freeze_message: __('Generating teamwear price matrix...'),
          callback: function (r) {
            if (!r.exc) {
              frappe.msgprint(r.message || __('Done'));
              frm.reload_doc();
            }
          }
        });
      }, __('Tools'));
    }
  }
});

// bench --site bet16 execute \textile_sulotion.textile_sulotion.teamwear_price_matrix_utils.generate_default_teamwear_price_matrix