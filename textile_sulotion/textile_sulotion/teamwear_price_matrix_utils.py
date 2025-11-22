import frappe

PLAIN_PRICES = {
    "MICRO":        140,
    "SOFT":         150,
    "DOTNET":       160,
    "REEBOK NET":   165,
    "FOOTBALL NET": 170,
    "COMBOLINE":    200,
    "POLO NET":     230,
}

SUBLIMATION_INCREMENTS = {
    "PLAIN":                0,
    "FRONT SUBLIMATION":    50,
    "TWO SIDE SUBLIMATION": 100,
    "FULL SUBLIMATION":     160,
}


@frappe.whitelist()
def generate_default_teamwear_price_matrix():
    """
    Create / update Teamwear Price Matrix records based on the
    plain price + fixed increments for each sublimation type.
    """
    created = []
    updated = []

    for fabric, base_price in PLAIN_PRICES.items():
        for sub_type, inc in SUBLIMATION_INCREMENTS.items():
            rate = base_price + inc

            # check if row already exists
            existing_name = frappe.db.get_value(
                "Teamwear Price Matrix",
                {
                    "fabric_type": fabric,
                    "sublimation_type": sub_type,
                },
                "name"
            )

            if existing_name:
                doc = frappe.get_doc("Teamwear Price Matrix", existing_name)
                doc.rate = rate
                doc.is_active = 1
                doc.save()
                updated.append(existing_name)
            else:
                doc = frappe.new_doc("Teamwear Price Matrix")
                doc.fabric_type = fabric
                doc.sublimation_type = sub_type
                doc.rate = rate
                doc.is_active = 1
                doc.insert()
                created.append(doc.name)

    frappe.db.commit()
    msg = f"Created {len(created)} rows, updated {len(updated)} rows."
    frappe.msgprint(msg)
    return {"created": created, "updated": updated, "message": msg}