import os
import socket
import urllib.request

from fastapi import FastAPI

app = FastAPI(title="dolphin-poc-hello")


def _fetch_instance_id() -> str:
    try:
        token_req = urllib.request.Request(
            "http://169.254.169.254/latest/api/token",
            method="PUT",
            headers={"X-aws-ec2-metadata-token-ttl-seconds": "60"},
        )
        token = urllib.request.urlopen(token_req, timeout=1).read().decode()
        id_req = urllib.request.Request(
            "http://169.254.169.254/latest/meta-data/instance-id",
            headers={"X-aws-ec2-metadata-token": token},
        )
        return urllib.request.urlopen(id_req, timeout=1).read().decode()
    except Exception:
        return "unknown"


INSTANCE_ID = _fetch_instance_id()


@app.get("/hello")
def hello():
    return {
        "msg": "hello from worker",
        "hostname": socket.gethostname(),
        "instance_id": INSTANCE_ID,
    }


@app.get("/healthz")
def healthz():
    return {"ok": True}
