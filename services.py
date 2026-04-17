import requests
import subprocess
import os

# =========================
# CONFIG (YOUR VALUES)
# =========================
GITEA_URL = "http://localhost:3000"
GITEA_TOKEN = "27d9bd8407abdd33ebab769cde9152fa7f58ad5e"
ORG_NAME = "UPSC_ORA"
LOCAL_REPO_PATH = "/home/gk/ORA/UPSC-ORA"

HEADERS = {
    "Authorization": f"token {GITEA_TOKEN}",
    "Content-Type": "application/json"
}


# =========================
# ORG
# =========================
def create_org():
    url = f"{GITEA_URL}/api/v1/orgs"
    data = {"username": ORG_NAME, "visibility": "private"}

    r = requests.post(url, json=data, headers=HEADERS)

    if r.status_code == 201:
        return "created"
    elif r.status_code == 422:
        return "exists"
    else:
        print(r.text)
        return "failed"


def check_org():
    r = requests.get(f"{GITEA_URL}/api/v1/orgs/{ORG_NAME}", headers=HEADERS)
    return r.status_code == 200


# =========================
# REPO
# =========================
def create_repo(repo_name):
    """
    Returns:
        True    — repo created successfully (201)
        "exists"— repo already exists (409)
        False   — creation failed (any other error)
    """
    r = requests.post(
        f"{GITEA_URL}/api/v1/orgs/{ORG_NAME}/repos",
        json={"name": repo_name, "private": True},
        headers=HEADERS
    )

    if r.status_code == 201:
        return True
    elif r.status_code == 409:
        return "exists"
    else:
        print(f"[create_repo] Failed for {repo_name}: {r.status_code} {r.text}")
        return False


# =========================
# GIT
# =========================
def get_branches():
    result = subprocess.run(
        "git branch -a", shell=True, capture_output=True, text=True
    )
    lines = result.stdout.splitlines()
    return list(set([
        b.replace("remotes/origin/", "").replace("*", "").strip()
        for b in lines
    ]))


def find_branch(service, branches):
    for b in branches:
        if service.lower() in b.lower():
            return b
    return None


def push_code(repo_name, branch_name, service_name):
    os.chdir(LOCAL_REPO_PATH)

    subprocess.run("git fetch --all", shell=True)

    branches = get_branches()

    if branch_name in branches:
        matched = branch_name
    else:
        matched = find_branch(service_name, branches)

    if not matched:
        return None

    repo_url = (
        f"http://admin:{GITEA_TOKEN}@localhost:3000/{ORG_NAME}/{repo_name}.git"
    )

    cmds = [
        f"git checkout {matched}",
        f"git pull origin {matched}",
        "git remote remove gitea || true",
        f"git remote add gitea {repo_url}",
        f"git push -u gitea {matched}:main --force"
    ]

    for c in cmds:
        subprocess.run(c, shell=True)

    return matched
