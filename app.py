from flask import Flask, render_template, request, jsonify
import pandas as pd
import os
from services import *

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# =========================
# HOME
# =========================
@app.route("/")
def index():
    return render_template("index.html")


# =========================
# INIT ORG
# =========================
@app.route("/init_org")
def init_org():
    result = create_org()

    if not check_org():
        return jsonify({"status": "failed"})

    return jsonify({
        "status": "ready",
        "org": ORG_NAME,
        "message": result
    })


# =========================
# UPLOAD EXCEL
# =========================
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["file"]
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    df = pd.read_excel(path)

    data = []
    for i, row in df.iterrows():
        data.append({
            "id": i,
            "service": str(row[df.columns[1]]),
            "branch": str(row.get("CURRENT BRANCH", "")),
            "locked": False,
            "status": "Pending"
        })

    return jsonify(data)


# =========================
# PROCESS (CREATE + PUSH)
# =========================
@app.route("/process", methods=["POST"])
def process():
    data = request.json

    service = data["service"]
    branch  = data["branch"]
    repo    = f"ngrp_ora_{service}_msvc"

    repo_result = create_repo(repo)

    # 409 = repo already exists on Gitea
    if repo_result == "exists":
        return jsonify({
            "status": "already_exists",
            "repo": repo
        })

    if not repo_result:
        return jsonify({"status": "repo_failed"})

    used_branch = push_code(repo, branch, service)

    if not used_branch:
        return jsonify({"status": "branch_failed"})

    return jsonify({
        "status": "completed",
        "repo": repo,
        "branch": "main"
    })


if __name__ == "__main__":
    app.run(debug=True, port=8002)
