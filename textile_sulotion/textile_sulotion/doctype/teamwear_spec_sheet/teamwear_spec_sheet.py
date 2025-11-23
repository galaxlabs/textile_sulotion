# Copyright (c) 2025, Galaxy labs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

def get_price_from_matrix(fabric_type: str, sublimation_type: str):
    if not (fabric_type and sublimation_type):
        return None

    row = frappe.db.get_value(
        "Teamwear Price Matrix",
        {
            "fabric_type": fabric_type,
            "sublimation_type": sublimation_type,
                
                },
        "rate"
    )
    return row


class TeamwearSpecSheet(Document):
    def validate(self):
        self.update_totals()
        self.update_estimated_price()

    def update_totals(self):
        total = 0
        hs = 0
        fs = 0

        for row in self.size_breakup:
            if not row.qty:
                continue

            total += row.qty

            if row.sleeve_type == "H/S":
                hs += row.qty
            elif row.sleeve_type == "F/S":
                fs += row.qty

        self.total_qty = total
        self.hs_total = hs
        self.fs_total = fs
    
    def update_estimated_price(self):
        rate = get_price_from_matrix(self.fabric_type, self.sublimation_type)
        if rate:
            self.estimated_rate = rate
            self.estimated_amount = rate * (self.total_qty or 0)
    




@frappe.whitelist()
def make_sales_order(source_name: str):
    doc = frappe.get_doc("Teamwear Spec Sheet", source_name)

    if not doc.customer:
        frappe.throw("Customer is required before creating Sales Order.")

    if not doc.shipping_date:
        frappe.throw("Required Dispatch Date is required before creating Sales Order.")

    if not (doc.hs_total or doc.fs_total):
        frappe.throw("No quantities found in Size Breakup.")

    so = frappe.new_doc("Sales Order")
    so.customer = doc.customer
    so.delivery_date = doc.shipping_date
    so.transaction_date = doc.order_date or frappe.utils.today()

    # H/S line
    if doc.hs_total and doc.hs_item:
        so.append("items", {
            "item_code": doc.hs_item,
            "qty": doc.hs_total,
            "schedule_date": doc.shipping_date,
            "teamwear_spec_sheet": doc.name,  # custom field on SO Item (we'll add later)
        })

    # F/S line
    if doc.fs_total and doc.fs_item:
        so.append("items", {
            "item_code": doc.fs_item,
            "qty": doc.fs_total,
            "schedule_date": doc.shipping_date,
            "teamwear_spec_sheet": doc.name,
        })

    # You can add value-added service items later here (double stitch, name/number, etc.)

    so.flags.ignore_mandatory = False
    so.save()
    so.submit()  # if you want it submitted immediately; else comment this line

    # Link back to spec sheet
    doc.sales_order = so.name
    doc.status = "Sales Order Created"
    doc.save()

    return so.name
