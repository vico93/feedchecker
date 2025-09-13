import json
import time
import hashlib
import os
import requests
import feedparser
from markdownify import markdownify as md

STATE_FILE = "state.json"
FEEDS_FILE = "feeds.json"
CHECK_INTERVAL = 300  # 5 minutos


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def hash_entry(entry):
    return hashlib.sha256(entry.link.encode()).hexdigest()


def process_feed(feed, state):
    url = feed["rss_url"]
    if url not in state or not isinstance(state[url], list):
        state[url] = []
    parsed = feedparser.parse(url)
    if url not in state or not state[url]:
        entries_to_process = parsed.entries[:3]  # newest 3
    else:
        entries_to_process = list(reversed(parsed.entries))

    if "entries" not in parsed:
        print(f"[WARN] Nenhuma entrada encontrada em {url}")
        return

    counter = 0
    for entry in entries_to_process:
        entry_id = hash_entry(entry)
        if entry_id in state.get(url, []):
            continue  # já postado

        if counter >= 3 and (url not in state or not state[url]):
            continue

        payload = {}
        if feed.get("webhook_title") and feed["webhook_title"].strip():
            payload["username"] = feed["webhook_title"]
        if feed.get("webhook_pfpurl") and feed["webhook_pfpurl"].strip():
            payload["avatar_url"] = feed["webhook_pfpurl"]

        if feed.get("is_forum_channel"):
            payload["thread_name"] = entry.title[:90]
            desc = entry.get("summary", "")
            if desc:
                desc_md = md(desc)
                payload["content"] = f"{desc_md.strip()}\n\n➡️ {entry.link}"
            else:
                payload["content"] = f"➡️ {entry.link}"

            # aplica tags, se houver
            if "tags" in feed and isinstance(feed["tags"], list):
                payload["applied_tags"] = [str(tag) for tag in feed["tags"]]
        else:
            payload["content"] = entry.link

        try:
            r = requests.post(feed["webhook_url"], json=payload, timeout=10)
            if r.status_code in (200, 204):
                print(f"[OK] Postado: {entry.title}")
                state.setdefault(url, []).append(entry_id)
                save_state(state)
                counter += 1
            else:
                print(f"[ERRO] Falha ao postar {entry.title}: {r.status_code} {r.text}")
        except requests.exceptions.RequestException as e:
            print(f"[ERRO] Falha de rede: {e}")


def main():
    if not os.path.exists(FEEDS_FILE):
        print(f"[ERRO] Arquivo {FEEDS_FILE} não encontrado.")
        return

    with open(FEEDS_FILE, "r", encoding="utf-8") as f:
        feeds = json.load(f)

    state = load_state()

    while True:
        for feed in feeds:
            process_feed(feed, state)
        save_state(state)
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
