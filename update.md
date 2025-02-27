# Update feed-generator

## Update rules

- Edit [src/db/migrations.ts](src/db/migrations.ts) to modify rules.

- Stop server.

Press `Ctrl+C` in terminal that runs `yarn start`.

- Backup database.

```bash
cd feed-generator
cp -p db.sqlite3 db.sqlite3.bak
```

- Delete rules.

```bash
$ sqlite3 db.sqlite3

sqlite> .mode column
sqlite> .headers on

sqlite> SELECT * FROM kysely_migration ;
name  timestamp
----  ------------------------
001   2023-07-22T18:51:24.737Z
002   2023-07-28T08:25:11.180Z
003   2024-02-11T15:26:49.610Z

sqlite> DELETE FROM kysely_migration WHERE name = '003' ;
sqlite> SELECT * FROM kysely_migration ;
name  timestamp
----  ------------------------
001   2023-07-22T18:51:24.737Z
002   2023-07-28T08:25:11.180Z

sqlite> SELECT feed FROM rule ;
feed
-------------
tech-news
whats-chatgpt
whats-llm

sqlite> DELETE FROM rule ;
sqlite> SELECT feed FROM rule ;
sqlite> VACUUM ;
sqlite> .quit
```

- Restart server.

```bash
cd feed-generator
yarn start
```

- Confirm rules are updated.

```bash
$ sqlite3 db.sqlite3

sqlite> .mode column
sqlite> .headers on

sqlite> SELECT * FROM kysely_migration ;
name  timestamp
----  ------------------------
001   2023-07-22T18:51:24.737Z
002   2023-07-28T08:25:11.180Z
003   2025-02-27T08:24:37.188Z

sqlite> SELECT feed FROM rule ;
feed
-------------
tech-news
whats-chatgpt
whats-llm

sqlite> .quit
```
