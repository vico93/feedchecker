import json
import time
import requests
import feedparser
from markdownify import markdownify as md

CONFIG_FILE = "feeds.json"
STATE_FILE = "state.json"

try:
    with open(STATE_FILE, "r") as f:
        last_posts = json.load(f)
except FileNotFoundError:
    last_posts = {}

def send_to_webhook(feed, entry):
    # Monta payload básico
    payload = {}
    if feed.get("webhook_title") and feed["webhook_title"].strip():
        payload["username"] = feed["webhook_title"]
    if feed.get("webhook_pfpurl") and feed["webhook_pfpurl"].strip():
        payload["avatar_url"] = feed["webhook_pfpurl"]

    if feed.get("is_forum_channel"):
        payload["thread_name"] = entry.title[:90]  # Nome da thread (máx. 90 chars)
        desc = entry.get("summary", "")
        if desc:
            desc_md = md(desc)
            payload["content"] = f"{desc_md.strip()}\n\n➡️ {entry.link}"
        else:
            payload["content"] = f"➡️ {entry.link}"
    else:
        payload["content"] = entry.link

    resp = requests.post(feed["webhook_url"], json=payload)
    print(f"Postado '{entry.title}' -> {resp.status_code}")

def main():
    global last_posts
    while True:
        with open(CONFIG_FILE, "r") as f:
            feeds = json.load(f)

        for feed in feeds:
            rss = feedparser.parse(feed["rss_url"])
            if not rss.entries:
                continue

            last_guid = last_posts.get(feed["rss_url"])
            if last_guid is None:
                new_entries = rss.entries[:3]
            else:
                new_entries = []
                for entry in rss.entries:
                    guid = entry.get("id") or entry.get("link")
                    if guid == last_guid:
                        break
                    new_entries.append(entry)

            # Posta do mais antigo pro mais recente
            for entry in reversed(new_entries):
                send_to_webhook(feed, entry)
                last_posts[feed["rss_url"]] = entry.get("id") or entry.get("link")

        with open(STATE_FILE, "w") as f:
            json.dump(last_posts, f, indent=2)

        time.sleep(300)  # Espera 5 min

if __name__ == "__main__":
    main()
