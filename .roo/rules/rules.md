## 1. Project Overview

- **Project Name:** FeedParser
- **Language:** Node.js
- **Main Libraries:** `node-cron`, `rss-parser`, `better-sqlite3` and `axios`
- **Database:** SQLite, accessed via the `better-sqlite3` package.
- **Objective:** This code act as a "bridge" between RSS (and later a couple of other sources/APIs) to Discord via webhooks.

Of course. Here is the architecture and file structure documentation in English, ready for your instructions.

---

## 2. Architecture and File Structure

The project structure is modular and must be respected to maintain organization and facilitate future expansion.

-   `index.js`: The main entry point. Responsible for initializing the task scheduler (`cron`), reading the configuration, and orchestrating the execution of the source, destination, and storage modules.

-   `src/`: Contains all the main logic and abstractions of the application.
    -   `sources/`: Contains the modules for fetching data from different sources. Currently, it holds `rss.js` for RSS feeds. Each file here should be capable of fetching and returning a list of new items from a specific source.
    -   `destinations/`: Contains the modules for sending data to the configured destinations. `discord.js` is responsible for formatting and sending messages to Discord webhooks.
    -   `storage.js`: The SQLite database access module. **All database interactions MUST go through this file.**

-   `data/`: (Suggested creation) A folder to store stateful data, such as the `bridge.db` database file. This helps to separate the application's code from the data it generates and consumes.

-   `destinations.json`: Stores **all** configurations for the "bridges", such as source URLs and destination webhooks. **NEVER** hardcode sensitive information (API keys, tokens) directly into the code.

-   `destinations.example.json`: Since `destinations.json` is a private and sensitive file (and is ignored by Git), this file serves as a "template"/"stub" variation of that file. It shows the required structure for `destinations.json` without containing any private URLs or data. If you make any changes to the structure of `destinations.json`, you must replicate them here (without the private data).

## 3. Code Patterns and Best Practices

### 3.1. Style and Comments

- **Language:** Always write comments in Portuguese (brazilian) for clarity for the author, while the code can be made in English for standartization.
- **File Header:** Maintain the header comment pattern in files for documentation and history where applicable:
  ```javascript
  /*
  ** caminho: [path/to/file.js]
  ** últimaMod: [YYYY-MM-DD HH:MM]
  ** autor: Vico
  ** colaboração: [Model being used for the task, currently `Roo Sonic (xai/grok-code-fast-1)` - DON'T REMOVE OTHER ENTRIES ON THE LINE, JUTS APPEND THE NEW ONE IF NOT THERE YET!!!]
  */
  ```
- **Block Comments:** Use comments (`/* --- Title --- */`) to separate and explain logical sections within a file, especially in longer ones like `messageCreate.js` or `database.js`.
- **Logging:** Standardize log messages to facilitate debugging. Ex: `console.error('[MODULE][ERROR] Error message:', err);`.