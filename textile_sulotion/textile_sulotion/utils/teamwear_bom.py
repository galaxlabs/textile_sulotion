# /home/dg/dg-b/apps/textile_sulotion/textile_sulotion/textile_sulotion/utils/teamwear_bom.py
import frappe

# Map product_type / item_group → default fabric & thread consumption (per piece)
FABRIC_CONSUMPTION = {
    "JERSEY":    1.1,   # meters per jersey
    "SHORTS":    0.7,   # meters per shorts
    "TRACKSUIT": 1.8,   # meters per tracksuit
}

THREAD_CONSUMPTION = {
    "JERSEY":    0.02,  # cones/meters per jersey (pick unit you use on item)
    "SHORTS":    0.015,
    "TRACKSUIT": 0.03,
}

# Map Item Attribute "Fabric" → raw fabric item code
FABRIC_ITEM_MAP = {
    "Micro":        "Fabric-Micro",
    "Soft Micro":   "Fabric-Soft Micro",
    "Dot Net":      "Fabric-Dot Net",
    "Reebok Net":   "Fabric-Reebok Net",
    "Football Net": "Fabric-Football Net",
    "Cromboline":   "Fabric-Cromboline",
    "Jkart":        "Fabric-Jkart",
    "Lycra":        "Fabric-Lycra",
    "Superpoly":    "Fabric-Superpoly",
    "Honeycomb":    "Fabric-Honeycomb",
    "Polonet":      "Fabric-Polonet",
}

DEFAULT_THREAD_ITEM = "Thread-TG"  # Thread Genral


def get_product_type_from_item_group(item_group: str) -> str | None:
    """
    Simple mapper: item_group → high level type
    Assumes your finished items are under JERSEY/SHORTS/TRACKSUIT groups.
    """
    if item_group in ("JERSEY", "SHORTS", "TRACKSUIT"):
        return item_group
    return None


def get_fabric_and_gsm_from_attributes(item) -> tuple[str | None, int | None]:
    """Read Fabric + GSM from Item attributes."""
    fabric = None
    gsm = None

    for attr in (item.attributes or []):
        if attr.attribute == "Fabric":
            fabric = attr.attribute_value
        elif attr.attribute == "GSM":
            try:
                gsm = int(attr.attribute_value)
            except Exception:
                pass

    return fabric, gsm


@frappe.whitelist()
def generate_teamwear_boms_for_garments_products():
    """
    Auto-create or update BOMs for all finished items in Garments Products
    (JERSEY, SHORTS, TRACKSUIT), using Fabric + GSM attributes
    to select raw fabric, plus a default thread item.
    """
    created = []
    updated = []
    skipped = []

    # 1. Find all finished items under Garments Products
    #    Here we pick item_group in (JERSEY, SHORTS, TRACKSUIT)
    items = frappe.get_all(
        "Item",
        filters={
            "is_stock_item": 1,
            "disabled": 0,
            "item_group": ["in", ["JERSEY", "SHORTS", "TRACKSUIT"]],
        },
        fields=["name", "item_group", "has_variants", "variant_of"]
    )

    for row in items:
        item_code = row.name
        product_type = get_product_type_from_item_group(row.item_group)
        if not product_type:
            skipped.append((item_code, "Unknown product_type"))
            continue

        # 2. Load full Item doc to see attributes
        item_doc = frappe.get_doc("Item", item_code)
        fabric_attr, gsm_attr = get_fabric_and_gsm_from_attributes(item_doc)

        if not fabric_attr:
            skipped.append((item_code, "No Fabric attribute"))
            continue

        raw_fabric_item = FABRIC_ITEM_MAP.get(fabric_attr)
        if not raw_fabric_item:
            skipped.append((item_code, f"No raw fabric mapping for {fabric_attr}"))
            continue

        fabric_qty = FABRIC_CONSUMPTION.get(product_type)
        thread_qty = THREAD_CONSUMPTION.get(product_type)

        if not fabric_qty:
            skipped.append((item_code, f"No fabric consumption defined for {product_type}"))
            continue

        # 3. Check if BOM already exists for this finished item
        existing_bom_name = frappe.db.get_value(
            "BOM",
            {"item": item_code, "is_default": 1, "docstatus": ["<", 2]},
            "name"
        )

        if existing_bom_name:
            bom = frappe.get_doc("BOM", existing_bom_name)
            # Clear old items and rebuild them (simple strategy)
            bom.set("items", [])
            action = "updated"
        else:
            bom = frappe.new_doc("BOM")
            bom.item = item_code
            bom.quantity = 1
            bom.is_default = 1
            bom.set("items", [])
            action = "created"

        # 4. Add fabric row
        bom.append("items", {
            "item_code": raw_fabric_item,
            "qty": fabric_qty,
            "uom": "Meter",        # adjust if your fabric UOM differs
            "stock_uom": "Meter",
        })

        # 5. Add thread row (optional)
        if DEFAULT_THREAD_ITEM and thread_qty:
            bom.append("items", {
                "item_code": DEFAULT_THREAD_ITEM,
                "qty": thread_qty,
                "uom": "Meter",      # or "Meter" / "Cone" depending on your setup
                "stock_uom": "Meter",
            })

        # 6. Save/submit BOM
        bom.flags.ignore_mandatory = True
        if existing_bom_name:
            bom.save()
            updated.append(bom.name)
        else:
            bom.insert()
            created.append(bom.name)

    frappe.db.commit()
    msg = f"Created {len(created)} BOMs, Updated {len(updated)}, Skipped {len(skipped)}."
    frappe.msgprint(msg)

    # Optionally show skipped reasons in console/log
    for item_code, reason in skipped:
        frappe.logger().info(f"[Teamwear BOM] Skipped {item_code}: {reason}")

    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "message": msg,
    }
