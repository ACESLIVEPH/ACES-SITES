# ACES-SITES

Source of truth for Jayson's two static sites. The server pulls this repo
every 5 minutes and rsyncs (without `--delete`) into the live web roots —
so files deleted here are never deleted on the server, and anything on the
server but not in the repo is left alone.

- `acesliveph/` → https://acesliveph.com
  (server: `/docker/acesliveph/html`)
- `btcisgto.cloud/` → https://btcisgto.cloud
  (server: `/var/www/btcisgto.cloud/public_html`)

## Deploy (runs on the VPS via cron, every 5 min)

```sh
cd /opt/aces-sites \
  && git pull --ff-only \
  && rsync -a acesliveph/ /docker/acesliveph/html/ \
  && rsync -a btcisgto.cloud/ /var/www/btcisgto.cloud/public_html/
```

A backup of both web roots is taken before the first pull.

## Notes

- Extensionless files (`about`, `rooms`, `tools`, …) are HTML pages served
  via nginx `try_files` — keep their exact filenames.
- `/brainstorm` is a separate app (its own container + data volume) and is
  intentionally not part of this repo.
- Binary images: the GitHub file API used for seeding carries text only, so
  the 4 images under `acesliveph/visual-20260912/` were not pushed in the
  seed commit. They already exist on the server and `rsync` without
  `--delete` preserves them. Image changes should be added to the repo
  through a client that supports binary upload.
