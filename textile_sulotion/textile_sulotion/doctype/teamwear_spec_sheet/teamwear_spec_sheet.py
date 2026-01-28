# Copyright (c) 2025, Galaxy labs and contributors
# For license information, please see license.txt
import io
from frappe.utils.file_manager import get_file
from openpyxl import load_workbook
import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, getdate, today
from frappe.model.naming import make_autoname


def get_price_from_matrix(fabric: str, sublimation_type: str, company: str = None):
    if not (fabric and sublimation_type):
        return None

    filters = {"fabric": fabric, "sublimation_type": sublimation_type}

    # company is optional: if not set, try company-specific first? (we'll do fallback)
    if company:
        rate = frappe.db.get_value("Teamwear Price Matrix", {**filters, "company": company}, "rate")
        if rate is not None:
            return rate

    # fallback: row with blank company (optional behavior)
    rate = frappe.db.get_value("Teamwear Price Matrix", filters, "rate")
    return rate


class TeamwearSpecSheet(Document):
    def validate(self):
        self.block_changes_after_approval()
        self.update_totals()
        self.update_estimated_price()
        self.set_job_status_from_priority()

        self.estimated_rate = self.estimated_rate or 0
        self.estimated_amount = self.estimated_amount or 0

    
    def set_job_status_from_priority(self):
        # default priority
        if not self.order_priority:
            self.order_priority = "Regular"

        if self.order_priority == "Emergency":
            self.job_status = "Urgent Queue"
        else:
            self.job_status = "Planned"

    def block_changes_after_approval(self):
        if self.is_new():
            return  # new doc, no old to compare

        old = frappe.get_doc(self.doctype, self.name)

        # If already Approved, block changes to critical fields
        if old.status == "Approved" and self.status == "Approved":
            locked_fields = [
                "customer", "order_date", "shipping_date", "fabric",
                "sublimation_type", "hs_item", "fs_item", "size_breakup", "order_priority"
            ]
            for f in locked_fields:
                if frappe.as_json(old.get(f)) != frappe.as_json(self.get(f)):
                    frappe.throw(f"Cannot change '{f}' after approval.")


    # ---------- Naming / Defaults ----------
    def before_validate(self):
        # keep cust_abbr always filled
        if self.customer and not self.cust_abbr:
            self.cust_abbr = self.make_customer_abbr(self.customer)

        # submitted/enquiry date default
        if not self.order_date:
            self.order_date = nowdate()

    def autoname(self):
        if not self.customer:
            frappe.throw("Customer must be set before naming the Spec Sheet.")

        if not self.order_date:
            self.order_date = nowdate()

        cust_abbr = self.clean_abbr(self.cust_abbr or self.make_customer_abbr(self.customer)) or "CUST"
        self.cust_abbr = cust_abbr  # persist

        yymm = getdate(self.order_date).strftime("%y-%m")  # e.g. 26-01
        series_key = f"TW-{yymm}-{cust_abbr}-.###"
        self.name = make_autoname(series_key)
    
    def before_submit(self):
        # HARD RULE: cannot submit unless approved
        if self.status != "Approved":
            frappe.throw("You cannot Submit until Status is Approved.")

        # Mandatory checks only when Approved (you asked)
        if not self.customer:
            frappe.throw("Customer is required.")
        if not self.shipping_date:
            frappe.throw("Required Dispatch Date is required.")
        if not self.fabric:
            frappe.throw("Fabric is required for approval/submit.")
        if not self.attachment:
            frappe.throw("Artwork / Design File is required for approval/submit.")
        if not self.design_approved:
            frappe.throw("Tick 'Design Approved by Customer' before Submit.")

        if (self.total_qty or 0) <= 0:
            frappe.throw("Total Qty must be greater than 0 (check Size Breakup).")

        if self.name_number_required and not self.player_list:
            frappe.throw("Player List is required because 'Player Names / Numbers' is checked.")

    def make_customer_abbr(self, customer_name: str) -> str:
        # If Customer has custom field "abbr", use it. Otherwise auto-generate.
        abbr = None

        # check field exists in meta (prevents SQL unknown column error)
        customer_meta = frappe.get_meta("Customer")
        if customer_meta.has_field("abbr"):
            abbr = frappe.db.get_value("Customer", customer_name, "abbr")

        if abbr:
            return self.clean_abbr(abbr)

        # fallback: build from customer name
        words = (customer_name or "").replace("-", " ").replace("_", " ").split()
        guess = "".join([w[0] for w in words if w][:4]) or "CUST"
        return self.clean_abbr(guess)

    def clean_abbr(self, abbr: str) -> str:
        abbr = "".join([c for c in (abbr or "") if c.isalnum()]).upper()
        return (abbr[:4] or "CUST")

    # ---------- Core Validations / Calculations ----------
    def update_totals(self):
        total = 0
        hs = 0
        fs = 0

        for row in (self.size_breakup or []):
            qty = row.qty or 0
            if qty <= 0:
                continue

            total += qty

            if row.sleeve_type == "H/S":
                hs += qty
            elif row.sleeve_type == "F/S":
                fs += qty

        self.total_qty = total
        self.hs_total = hs
        self.fs_total = fs

    def update_estimated_price(self):
        # NOTE: your current doc has fabric_type hidden select AND fabric (Link to Item)
        # You are using fabric_type in matrix lookup in your code. Keep it if matrix uses fabric.
        rate = get_price_from_matrix(self.fabric, self.sublimation_type, company=self.company)

        if rate is not None:
            self.estimated_rate = rate
            self.estimated_amount = rate * (self.total_qty or 0)
        else:
            # keep values but do not crash
            self.estimated_rate = self.estimated_rate or 0
            self.estimated_amount = (self.estimated_rate or 0) * (self.total_qty or 0)


@frappe.whitelist()
def make_sales_order(source_name: str):
    """
    Create Sales Order from Teamwear Spec Sheet.
    IMPORTANT: You said "Require Approval" -> so we create SO in Draft (NOT submit).
    """
    doc = frappe.get_doc("Teamwear Spec Sheet", source_name)

    if doc.status != "Approved":
        frappe.throw("Spec Sheet must be Approved before creating Sales Order.")


    if not doc.customer:
        frappe.throw("Customer is required before creating Sales Order.")

    if not doc.shipping_date:
        frappe.throw("Required Dispatch Date is required before creating Sales Order.")

    if not (doc.hs_total or doc.fs_total):
        frappe.throw("No quantities found in Size Breakup.")

    so = frappe.new_doc("Sales Order")
    so.customer = doc.customer
    so.delivery_date = doc.shipping_date
    so.transaction_date = doc.order_date or today()

    # H/S line
    if doc.hs_total and doc.hs_item:
        so.append("items", {
            "item_code": doc.hs_item,
            "qty": doc.hs_total,
            "schedule_date": doc.shipping_date,
            # add custom field later on Sales Order Item if needed:
            # "teamwear_spec_sheet": doc.name,
        })

    # F/S line
    if doc.fs_total and doc.fs_item:
        so.append("items", {
            "item_code": doc.fs_item,
            "qty": doc.fs_total,
            "schedule_date": doc.shipping_date,
            # "teamwear_spec_sheet": doc.name,
        })

    so.flags.ignore_mandatory = False
    so.insert()  # draft sales order (approval required)

    # Link back to spec sheet (do not set "Sales Order Created" if you want approval step)
    doc.sales_order = so.name
    doc.status = "Sales Order Created"  # or "Approved" based on your workflow
    doc.save()

    return so.name

@frappe.whitelist()
def import_player_list(docname: str, file_url: str):
    doc = frappe.get_doc("Teamwear Spec Sheet", docname)

    if not doc.name_number_required:
        frappe.throw("Tick 'Player Names / Numbers' first.")

    # get file
    file_doc = get_file(file_url)
    content = file_doc[1]  # bytes

    wb = load_workbook(filename=io.BytesIO(content), data_only=True)
    ws = wb.active

    # Expected headers in row 1:
    # Player Name | Jersey Number | Size | Remarks
    header = [str(c.value).strip().lower() if c.value else "" for c in ws[1]]
    col_map = {name: idx for idx, name in enumerate(header)}

    required = ["player name", "jersey number", "size"]
    for r in required:
        if r not in col_map:
            frappe.throw(f"Missing column in Excel: {r}")

    # clear existing rows
    doc.set("player_list", [])

    imported = 0
    skipped = 0
    seen_numbers = set()

    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row:
            continue

        player_name = row[col_map["player name"]]
        jersey_number = row[col_map["jersey number"]]
        size = row[col_map["size"]]
        remarks = row[col_map["remarks"]] if "remarks" in col_map else None

        if not player_name or not jersey_number or not size:
            skipped += 1
            continue

        jersey_number_str = str(jersey_number).strip()
        if jersey_number_str in seen_numbers:
            skipped += 1
            continue
        seen_numbers.add(jersey_number_str)

        doc.append("player_list", {
            "player_name": str(player_name).strip(),
            "jersey_number": jersey_number_str,
            "size": str(size).strip(),
            "remarks": str(remarks).strip() if remarks else ""
        })
        imported += 1

    doc.save()

    return {"imported": imported, "skipped": skipped}
