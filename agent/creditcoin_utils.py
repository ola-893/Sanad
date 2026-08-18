# -*- coding: utf-8 -*-
"""
creditcoin_utils.py
Creditcoin 3 (CC3) audit event logging utilities for Sanad AI Agents.
"""

import os
import json
from datetime import datetime

CREDITCOIN_RPC_URL = os.getenv("CREDITCOIN_RPC_URL", "https://rpc.cc3-testnet.creditcoin.network")
CREDITCOIN_CHAIN_ID = int(os.getenv("CREDITCOIN_CHAIN_ID", "102031"))

def format_evaluation_trace(eval_id: str, prompt: str, result: dict) -> dict:
    """
    Formats the AI risk evaluation into an auditable trace structure for IPFS & Creditcoin CC3.
    """
    return {
        "evalId": eval_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "network": "Creditcoin 3 Testnet",
        "chainId": CREDITCOIN_CHAIN_ID,
        "inputPrompt": prompt,
        "evaluation": result,
    }
