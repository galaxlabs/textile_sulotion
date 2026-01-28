# /home/dg/dg-b/apps/textile_sulotion/textile_sulotion/textile_sulotion/utils/teamwear_price_matrix.py
# Copyright (c) 2025, Galaxy labs and contributors
# For license information, please see license.txt
import frappe


def get_default_company():
    return (
        frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.defaults.get_global_default("company")
    )


def get_active_pricing_rule(company: str) -> str | None:
    rule = frappe.get_all(
        "Teamwear Pricing Rule",
        filters={"company": company, "is_active": 1},
        fields=["name"],
        limit=1
    )
    return rule[0].name if rule else None


@frappe.whitelist()
def generate_teamwear_price_matrix(update_existing: int = 1):
    """
    Standard generator:
    - Reads Teamwear Pricing Rule (Base + Increment)
    - Generates/updates Teamwear Price Matrix:
        rate = plain_rate + increment
    """
    company = get_default_company()
    if not company:
        frappe.throw("Default Company is not set in Global Defaults.")

    rule_name = get_active_pricing_rule(company)
    if not rule_name:
        frappe.throw(f"No active Teamwear Pricing Rule found for company: {company}")

    rule = frappe.get_doc("Teamwear Pricing Rule", rule_name)

    base_rows = rule.get("teamwear_fabric_base_rate") or []
    inc_rows = rule.get("teamwear_sublimation_increment_rate") or []

    base_map = {r.fabric: (r.plain_rate or 0) for r in base_rows if r.fabric}
    inc_map = {r.sublimation_type: (r.increment or 0) for r in inc_rows if r.sublimation_type}

    if not base_map:
        frappe.throw("No Fabric Base Rate rows found in Pricing Rule.")
    if not inc_map:
        frappe.throw("No Sublimation Increment rows found in Pricing Rule.")

    created = 0
    updated = 0

    for fabric, base in base_map.items():
        for sub_item, inc in inc_map.items():
            rate = (base or 0) + (inc or 0)

            # Teamwear Price Matrix autoname: format:{company}-{fabric}-{sublimation_type}
            name = f"{company}-{fabric}-{sub_item}"

            if frappe.db.exists("Teamwear Price Matrix", name):
                if int(update_existing):
                    doc = frappe.get_doc("Teamwear Price Matrix", name)
                    changed = False

                    if not doc.company:
                        doc.company = company
                        changed = True

                    if (doc.rate or 0) != rate:
                        doc.rate = rate
                        changed = True

                    if changed:
                        doc.save(ignore_permissions=True)
                        updated += 1
                continue

            d = frappe.new_doc("Teamwear Price Matrix")
            d.company = company
            d.fabric = fabric
            d.sublimation_type = sub_item
            d.rate = rate
            d.insert(ignore_permissions=True)
            created += 1

    frappe.db.commit()
    return {"created": created, "updated": updated, "company": company, "rule": rule_name}
