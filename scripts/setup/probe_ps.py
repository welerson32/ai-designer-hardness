import os
import sys

sys.path.insert(0, os.getcwd())

import socket_client  # noqa: E402

socket_client.configure(app="photoshop", url="http://localhost:3001", timeout=4)

try:
    socket_client.send_message_blocking(
        {"application": "photoshop", "action": "getDocuments", "options": {}}, timeout=4
    )
    print("OK")
except socket_client.AppError:
    print("OK plugin respondeu com erro (ex.: sem documento aberto)")
except RuntimeError as exc:
    texto = str(exc)
    if "proxy server" in texto:
        print("SEM_PROXY")
    elif "Timed Out" in texto:
        print("SEM_PLUGIN")
    else:
        print(f"ERRO {texto}")
except Exception as exc:
    print(f"ERRO {exc}")
