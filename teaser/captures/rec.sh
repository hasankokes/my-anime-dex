#!/bin/zsh
# usage: rec.sh start <name> | rec.sh stop
# Records outside the repo (Metro watches the project and would Fast-Refresh
# mid-take), then moves the finished file into raw/.
DIR="$(cd "$(dirname "$0")" && pwd)/raw"
TMP="$HOME/Library/Caches/myanimedex-teaser-rec"
mkdir -p "$TMP" "$DIR"
case "$1" in
  start)
    echo "$2" > "$TMP/.name"
    nohup xcrun simctl io booted recordVideo --codec=h264 --force "$TMP/$2.mov" > "$TMP/.rec.log" 2>&1 &
    echo $! > "$TMP/.pid"; sleep 1.5; echo "recording $2 (pid $(cat $TMP/.pid))" ;;
  stop)
    PID="$(cat $TMP/.pid)"; NAME="$(cat $TMP/.name)"
    kill -INT "$PID"; while kill -0 "$PID" 2>/dev/null; do sleep 0.2; done
    rm -f "$TMP/.pid"; echo "$NAME" ;;
  collect)
    mv "$TMP"/*.mov "$DIR"/ 2>/dev/null; ls "$DIR" ;;
esac
