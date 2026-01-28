# Copyright (c) 2026, Galaxy labs and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class TeamwearPricingRule(Document):
    def validate(self):
        self._validate_unique_child("teamwear_fabric_base_rate", "fabric", "Duplicate Fabric in Fabric Base Rate")
        self._validate_unique_child("teamwear_sublimation_increment_rate", "sublimation_type", "Duplicate Sublimation Item in Increment Rate")

    def _validate_unique_child(self, tablefield, keyfield, msg):
        seen = set()
        for r in self.get(tablefield) or []:
            v = r.get(keyfield)
            if not v:
                continue
            if v in seen:
                frappe.throw(msg + f": {v}")
            seen.add(v)
