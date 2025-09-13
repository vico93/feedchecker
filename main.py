import json
import time
from datetime import datetime, timezone, timedelta
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


def process_feed(feed, state):
    url = feed["rss_url"]
    now = datetime.now(timezone.utc)

    # Backward compatibility: if old list format, set to now - 1 hour
    if url in state and isinstance(state[url], list):
        state[url] = (now - timedelta(hours=1)).isoformat()

    parsed = feedparser.parse(url)
    if "entries" not in parsed:
        print(f"[WARN] Nenhuma entrada encontrada em {url}")
        return

    # Sort entries by published_parsed descending (newest first)
    def get_entry_time(entry):
        if 'published_parsed' in entry:
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        else:
            # Use a very old date if missing
            return datetime(1970, 1, 1, tzinfo=timezone.utc)

    entries = sorted(parsed.entries, key=get_entry_time, reverse=True)

    entries_to_post = []
    if url not in state or state[url] is None:
        # First time: select 3 newest entries
        entries_to_post = entries[:3]
    else:
        # Parse last timestamp
        last_timestamp_str = state[url]
        last_timestamp = datetime.fromisoformat(last_timestamp_str)
        for entry in entries:
            if 'published_parsed' not in entry:
                continue
            entry_dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            if entry_dt > last_timestamp:
                entries_to_post.append(entry)

    new_entries_count = len(entries_to_post)
    print(f"[INFO] Found {new_entries_count} new entries for {url}")

    for entry in entries_to_post:
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
            else:
                print(f"[ERRO] Falha ao postar {entry.title}: {r.status_code} {r.text}")
        except requests.exceptions.RequestException as e:
            print(f"[ERRO] Falha de rede: {e}")

    # Update state to current timestamp
    state[url] = now.isoformat()
    save_state(state)


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
