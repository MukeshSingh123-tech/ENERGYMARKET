# models.py
# Minimal placeholder simulation models for Nanogrid, SolarPanel, Battery, AI_Controller.
# Replace with your actual simulation classes if you have them.

import math
import random
from datetime import datetime

class SolarPanel:
    def __init__(self, capacity_kw=5.0):
        self.capacity_kw = capacity_kw
    def get_output(self, hour):
        # simple diurnal model: peak at noon
        peak = self.capacity_kw
        # hour is 0-23
        x = math.cos((hour-12)/24.0*2*math.pi)
        out = max(0.0, peak * (0.5 + 0.5*x))  # between 0 and peak
        # small randomness
        out += random.uniform(-0.2, 0.2)
        return max(0.0, out)

class Battery:
    def __init__(self, capacity_kwh=10.0):
        self.capacity_kwh = capacity_kwh
        self.state_of_charge = 0.5
        self.health = 1.0
    def charge(self, kw, hours=1.0):
        # simple integrate
        delta = kw * hours / (self.capacity_kwh + 1e-9)
        self.state_of_charge = min(1.0, max(0.0, self.state_of_charge + delta))
    def discharge(self, kw, hours=1.0):
        delta = kw * hours / (self.capacity_kwh + 1e-9)
        self.state_of_charge = min(1.0, max(0.0, self.state_of_charge - delta))

class Nanogrid:
    def __init__(self, nanogrid_id=1):
        self.nanogrid_id = nanogrid_id
        self.solar_panel = SolarPanel(capacity_kw=5.0)
        self.battery = Battery(capacity_kwh=10.0)
        self.load_demand = 5.0  # kW baseline
        self.current_power_balance = 0.0
    def update_state(self, solar_kw, hours=1.0):
        # basic balance: solar - demand
        balance = solar_kw - self.load_demand
        self.current_power_balance = balance
        if balance > 0:
            # charge battery with surplus
            self.battery.charge(balance, hours=hours)
        else:
            # discharge battery to supply deficit (limited)
            self.battery.discharge(min(-balance, self.battery.capacity_kwh), hours=hours)

class AI_Controller:
    def __init__(self):
        pass
    def control_action(self, state):
        # placeholder
        return {}
