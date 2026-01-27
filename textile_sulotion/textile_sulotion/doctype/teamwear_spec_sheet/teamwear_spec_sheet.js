// Copyright (c) 2025, Galaxy labs and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Teamwear Spec Sheet", {
// 	refresh(frm) {

// 	},
// });
frappe.ui.form.on('Teamwear Spec Sheet', {
  refresh(frm) {
    if (!frm.is_new() && frm.doc.docstatus === 0) {
      frm.add_custom_button(__('Make Sales Order'), function () {
        frappe.call({
          method: 'textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.make_sales_order',
          args: {
            source_name: frm.doc.name
          },
          callback: function (r) {
            if (!r.exc && r.message) {
              frappe.msgprint(__('Sales Order {0} created', [r.message]));
              frm.reload_doc();
              frappe.set_route('Form', 'Sales Order', r.message);
            }
          }
        });
      }, __('Create'));
    }
  }
});
frappe.ui.form.on('Teamwear Spec Sheet', {
    refresh(frm) {
        // set query for child table field 'size'
        frm.fields_dict['size_breakup'].grid.get_field('size').get_query = function() {
            return {
                filters: {
                    attribute: 'Size'
                }
            };
        };
    }
});
frappe.ui.form.on('Teamwear Spec Sheet', {
  fabric(frm) {
    if (!frm.doc.fabric) {
      frm.set_value('hs_item', null);
      frm.set_value('fs_item', null);
      frm.set_value('gsm', null);
      frm.set_value('fabric_type', null);
      return;
    }

    // Use the selected variant as HS/FS item by default
    frm.set_value('hs_item', frm.doc.fabric);
    frm.set_value('fs_item', frm.doc.fabric);

    // Fetch item doc to read attributes (Fabric, GSM)
    frappe.db.get_doc('Item', frm.doc.fabric).then(item => {
      let fabricAttr = null;
      let gsmAttr = null;

      (item.attributes || []).forEach(attr => {
        if (attr.attribute === 'Fabric') {
          fabricAttr = attr.attribute_value;   // e.g. "Micro", "Soft Micro"
        } else if (attr.attribute === 'GSM') {
          gsmAttr = attr.attribute_value;      // e.g. "280"
        }
      });

      // Map Item Attribute "Fabric" → Spec Sheet "fabric_type" (price matrix keys)
      if (fabricAttr) {
        const fabricMap = {
          'Micro':        'MICRO',
          'Soft Micro':   'SOFT',
          'Dot Net':      'DOTNET',
          'Reebok Net':   'REEBOK NET',
          'Football Net': 'FOOTBALL NET',
          'Cromboline':   'COMBOLINE',
          'Polonet':      'POLO NET',
          // add more if you need
        };

        frm.set_value('fabric_type', fabricMap[fabricAttr] || fabricAttr.toUpperCase());
      }

      if (gsmAttr) {
        frm.set_value('gsm', cint(gsmAttr));
      }
    });
  }
});
frappe.ui.form.on('Teamwear Spec Sheet', {
  refresh(frm) {
    // 1) Make Sales Order - show on any saved doc
    if (!frm.is_new()) {
      frm.add_custom_button(__('Make Sales Order'), function () {
        frappe.call({
          method: 'textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.make_sales_order',
          args: {
            source_name: frm.doc.name
          },
          callback: function (r) {
            if (!r.exc && r.message) {
              frappe.msgprint(__('Sales Order {0} created', [r.message]));
              frm.reload_doc();
              frappe.set_route('Form', 'Sales Order', r.message);
            }
          }
        });
      }, __('Actions'));
    }

    // 2) Tools: Generate BOMs & Price Matrix (for System Manager)
    if (frappe.user.has_role('System Manager')) {
      frm.add_custom_button(__('Generate Teamwear BOMs'), function () {
        frappe.call({
          method: 'textile_sulotion.textile_sulotion.utils.teamwear_bom.generate_teamwear_boms_for_garments_products',
          freeze: true,
          freeze_message: __('Generating BOMs for Garments Products...'),
          callback: function (r) {
            if (!r.exc && r.message) {
              frappe.msgprint(r.message.message || __('BOM generation complete.'));
            }
          }
        });
      }, __('Actions'));

      frm.add_custom_button(__('Generate Price Matrix'), function () {
        frappe.call({
          method: 'textile_sulotion.textile_sulotion.utils.teamwear_price_matrix.generate_default_teamwear_price_matrix',
          freeze: true,
          freeze_message: __('Generating / Updating Teamwear Price Matrix...'),
          callback: function (r) {
            if (!r.exc && r.message) {
              frappe.msgprint(r.message.message || __('Price matrix generation complete.'));
            }
          }
        });
      }, __('Actions'));
    }
  },
});

// frappe.ui.form.on('Teamwear Spec Sheet', {
//   refresh(frm) {
//     // 1) Existing Make Sales Order button
//     if (!frm.is_new() && frm.doc.docstatus === 0 && !frm.doc.sales_order) {
//       frm.add_custom_button(__('Make Sales Order'), function () {
//         frappe.call({
//           method: 'textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.make_sales_order',
//           args: {
//             source_name: frm.doc.name
//           },
//           callback: function (r) {
//             if (!r.exc && r.message) {
//               frappe.msgprint(__('Sales Order {0} created', [r.message]));
//               frm.reload_doc();
//               frappe.set_route('Form', 'Sales Order', r.message);
//             }
//           }
//         });
//       },  __('Actions'));
//     }

//     // 2) Tools: Generate BOMs & Price Matrix
//     // (Only show to System Manager, you can adjust roles)
//     if (frappe.user.has_role('System Manager')) {
//       frm.add_custom_button(__('Generate Teamwear BOMs'), function () {
//         frappe.call({
//           method: 'textile_sulotion.textile_sulotion.utils.teamwear_bom.generate_teamwear_boms_for_garments_products',
//           freeze: true,
//           freeze_message: __('Generating BOMs for Garments Products...'),
//           callback: function (r) {
//             if (!r.exc && r.message) {
//               frappe.msgprint(r.message.message || __('BOM generation complete.'));
//             }
//           }
//         });
//       }, __('Actions'));

//       frm.add_custom_button(__('Generate Price Matrix'), function () {
//         frappe.call({
//           method: 'textile_sulotion.textile_sulotion.utils.teamwear_price_matrix.generate_default_teamwear_price_matrix',
//           freeze: true,
//           freeze_message: __('Generating / Updating Teamwear Price Matrix...'),
//           callback: function (r) {
//             if (!r.exc && r.message) {
//               frappe.msgprint(r.message.message || __('Price matrix generation complete.'));
//             }
//           }
//         });
//       }, __('Actions'));
//     }

//     // If you also have other logic in refresh (set_query, etc.), keep it here
//     // e.g. set_base_template_query(frm); set_fabric_query(frm);
//   },

//   // ... your existing product_type, base_template, fabric handlers stay unchanged ...
// });
