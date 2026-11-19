import os
import sys

sys.path.insert(0, os.getcwd())

import socket_client  # noqa: E402

socket_client.configure(app="photoshop", url="http://localhost:3001", timeout=4)

try:
    response = socket_client.send_message_blocking(
        {"application": "photoshop", "action": "getDocuments", "options": {}}, timeout=4
    )
except Exception as exc:
    # Plugin respondeu, só não há documento aberto: a conexão está ok.
    if "Requires an open Photoshop document" in str(exc):
        print("OK sem documento aberto")
        sys.exit(0)
    print(f"ERRO {exc}")
    sys.exit(0)

print("OK" if response else "SEM_PLUGIN")
