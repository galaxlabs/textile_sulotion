// Copyright (c) 2025, Galaxy labs and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Teamwear Spec Sheet", {
// 	refresh(frm) {

// 	},
// });
// frappe.ui.form.on("Teamwear Spec Sheet", {
//   refresh(frm) {
//     // Size breakup grid size query (if you really need it)
//     if (frm.fields_dict.size_breakup) {
//       frm.fields_dict.size_breakup.grid.get_field("size").get_query = function () {
//         return { filters: { attribute: "Size" } };
//       };
//     }

//     // Make Sales Order button (only when Approved and no sales_order)
//     if (!frm.is_new() && frm.doc.status === "Approved" && !frm.doc.sales_order) {
//       frm.add_custom_button(__("Make Sales Order"), () => {
//         frappe.call({
//           method: "textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.make_sales_order",
//           args: { source_name: frm.doc.name },
//           callback(r) {
//             if (!r.exc && r.message) {
//               frappe.msgprint(__("Sales Order {0} created", [r.message]));
//               frm.reload_doc();
//               frappe.set_route("Form", "Sales Order", r.message);
//             }
//           }
//         });
//       }, __("Actions"));
//     }

//     // Tools buttons (System Manager)
//     if (frappe.user.has_role("System Manager")) {
//       frm.add_custom_button(__("Generate Teamwear BOMs"), () => {
//         frappe.call({
//           method: "textile_sulotion.textile_sulotion.utils.teamwear_bom.generate_teamwear_boms_for_garments_products",
//           freeze: true,
//           freeze_message: __("Generating BOMs for Garments Products..."),
//           callback(r) {
//             if (!r.exc) frappe.msgprint(__("BOM generation complete."));
//           }
//         });
//       }, __("Actions"));

//       frm.add_custom_button(__("Generate Price Matrix"), () => {
//         frappe.call({
//           method: "textile_sulotion.textile_sulotion.utils.teamwear_price_matrix.generate_default_teamwear_price_matrix",
//           freeze: true,
//           freeze_message: __("Generating / Updating Teamwear Price Matrix..."),
//           callback(r) {
//             if (!r.exc) frappe.msgprint(__("Price matrix generation complete."));
//           }
//         });
//       }, __("Actions"));
//     }
//   },

//   import_players_btn(frm) {
//     if (!frm.doc.player_list_excel) {
//       frappe.msgprint("Please attach Player List Excel file first.");
//       return;
//     }
//     if (!frm.doc.name_number_required) {
//       frappe.msgprint("Please tick 'Player Names / Numbers' first.");
//       return;
//     }

//     frappe.call({
//       method: "textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.import_player_list",
//       args: { docname: frm.doc.name, file_url: frm.doc.player_list_excel },
//       callback(r) {
//         if (r.message) {
//           frm.reload_doc();
//           frappe.msgprint(`Imported ${r.message.imported} players. Skipped ${r.message.skipped}.`);
//         }
//       }
//     });
//   }
// });

// frappe.ui.form.on('Teamwear Spec Sheet', {
//   refresh(frm) {
//     if (!frm.is_new() && frm.doc.docstatus === 0) {
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
//       }, __('Create'));
//     }
//   }
// });
// frappe.ui.form.on('Teamwear Spec Sheet', {
//     refresh(frm) {
//         // set query for child table field 'size'
//         frm.fields_dict['size_breakup'].grid.get_field('size').get_query = function() {
//             return {
//                 filters: {
//                     attribute: 'Size'
//                 }
//             };
//         };
//     }
// });
// frappe.ui.form.on('Teamwear Spec Sheet', {
//   fabric(frm) {
//     if (!frm.doc.fabric) {
//       frm.set_value('hs_item', null);
//       frm.set_value('fs_item', null);
//       frm.set_value('gsm', null);
//       frm.set_value('fabric_type', null);
//       return;
//     }

//     // Use the selected variant as HS/FS item by default
//     frm.set_value('hs_item', frm.doc.fabric);
//     frm.set_value('fs_item', frm.doc.fabric);

//     // Fetch item doc to read attributes (Fabric, GSM)
//     frappe.db.get_doc('Item', frm.doc.fabric).then(item => {
//       let fabricAttr = null;
//       let gsmAttr = null;

//       (item.attributes || []).forEach(attr => {
//         if (attr.attribute === 'Fabric') {
//           fabricAttr = attr.attribute_value;   // e.g. "Micro", "Soft Micro"
//         } else if (attr.attribute === 'GSM') {
//           gsmAttr = attr.attribute_value;      // e.g. "280"
//         }
//       });

//       // Map Item Attribute "Fabric" → Spec Sheet "fabric_type" (price matrix keys)
//       if (fabricAttr) {
//         const fabricMap = {
//           'Micro':        'MICRO',
//           'Soft Micro':   'SOFT',
//           'Dot Net':      'DOTNET',
//           'Reebok Net':   'REEBOK NET',
//           'Football Net': 'FOOTBALL NET',
//           'Cromboline':   'COMBOLINE',
//           'Polonet':      'POLO NET',
//           // add more if you need
//         };

//         frm.set_value('fabric_type', fabricMap[fabricAttr] || fabricAttr.toUpperCase());
//       }

//       if (gsmAttr) {
//         frm.set_value('gsm', cint(gsmAttr));
//       }
//     });
//   }
// });
// frappe.ui.form.on('Teamwear Spec Sheet', {
//   refresh(frm) {
//     // 1) Make Sales Order - show on any saved doc
//     if (!frm.is_new()) {
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
//       }, __('Actions'));
//     }

//     // 2) Tools: Generate BOMs & Price Matrix (for System Manager)
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
//   },
// });
// frappe.ui.form.on("Teamwear Spec Sheet", {
//   import_players_btn(frm) {
//     if (!frm.doc.player_excel) {
//       frappe.msgprint("Please attach Player List Excel file first.");
//       return;
//     }
//     if (!frm.doc.name_number_required) {
//       frappe.msgprint("Please tick 'Player Names / Numbers' first.");
//       return;
//     }

//     frappe.call({
//       method: "textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.import_player_list",
//       args: {
//         docname: frm.doc.name,
//         file_url: frm.doc.player_excel
//       },
//       callback(r) {
//         if (r.message) {
//           frm.reload_doc();
//           frappe.msgprint(`Imported ${r.message.imported} players. Skipped ${r.message.skipped}.`);
//         }
//       }
//     });
//   }
// });

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
// Copyright (c) 2025, Galaxy labs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Teamwear Spec Sheet", {
  setup(frm) {
    // Child table size query (ONLY once)
    if (frm.fields_dict.size_breakup) {
      frm.fields_dict.size_breakup.grid.get_field("size").get_query = function () {
        // If your child field "size" is Link to Item Attribute Value
        // then keep this; otherwise remove this block.
        return { filters: { parent: "Size" } };
      };
    }
  },

  refresh(frm) {
    // ---- Auto set default company (hidden field) ----
    frm.trigger("set_default_company");

    // ---- Make Sales Order button (only when Approved + no SO) ----
    if (!frm.is_new() && frm.doc.status === "Approved" && !frm.doc.sales_order) {
      frm.add_custom_button(__("Make Sales Order"), () => frm.trigger("make_sales_order"), __("Actions"));
    }

    // ---- Tools buttons (System Manager only) ----
    if (frappe.user.has_role("System Manager")) {
      frm.add_custom_button(__("Generate Teamwear BOMs"), () => {
        frappe.call({
          method: "textile_sulotion.textile_sulotion.utils.teamwear_bom.generate_teamwear_boms_for_garments_products",
          freeze: true,
          freeze_message: __("Generating BOMs for Garments Products..."),
          callback(r) {
            if (!r.exc) frappe.msgprint(__("BOM generation complete."));
          }
        });
      }, __("Actions"));

      frm.add_custom_button(__("Generate Price Matrix"), () => {
        frappe.call({
          method: "textile_sulotion.textile_sulotion.utils.teamwear_price_matrix.generate_default_teamwear_price_matrix",
          freeze: true,
          freeze_message: __("Generating / Updating Teamwear Price Matrix..."),
          callback(r) {
            if (!r.exc) frappe.msgprint(__("Price matrix generation complete."));
          }
        });
      }, __("Actions"));
    }
  },

  set_default_company(frm) {
    // Requires a hidden Link field "company" in Teamwear Spec Sheet
    // Use ERPNext default company
    if (!frm.doc.company) {
      frappe.db.get_single_value("Global Defaults", "default_company").then((company) => {
        if (company) frm.set_value("company", company);
      });
    }
  },

  make_sales_order(frm) {
    frappe.call({
      method: "textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.make_sales_order",
      args: { source_name: frm.doc.name },
      callback(r) {
        if (!r.exc && r.message) {
          frappe.msgprint(__("Sales Order {0} created", [r.message]));
          frm.reload_doc();
          frappe.set_route("Form", "Sales Order", r.message);
        }
      }
    });
  },

  // Keep ONLY fabric logic (no mapping, no fabric_type)
  fabric(frm) {
    // if you want auto set hs_item/fs_item same as fabric, keep it
    if (!frm.doc.fabric) {
      frm.set_value("hs_item", null);
      frm.set_value("fs_item", null);
      return;
    }
    // Optional: default HS/FS items to the same fabric item
    frm.set_value("hs_item", frm.doc.fabric);
    frm.set_value("fs_item", frm.doc.fabric);
  },

  import_players_btn(frm) {
    // Your attach field is "player_list_excel" (not player_excel)
    if (!frm.doc.player_list_excel) {
      frappe.msgprint(__("Please attach Player List Excel file first."));
      return;
    }
    if (!frm.doc.name_number_required) {
      frappe.msgprint(__("Please tick 'Player Names / Numbers' first."));
      return;
    }

    frappe.call({
      method: "textile_sulotion.textile_sulotion.doctype.teamwear_spec_sheet.teamwear_spec_sheet.import_player_list",
      args: { docname: frm.doc.name, file_url: frm.doc.player_list_excel },
      callback(r) {
        if (r.message) {
          frm.reload_doc();
          frappe.msgprint(__("Imported {0} players. Skipped {1}.", [r.message.imported, r.message.skipped]));
        }
      }
    });
  }
});
