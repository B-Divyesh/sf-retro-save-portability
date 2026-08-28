#!/bin/sh
set -eu

REPOSITORY="B-Divyesh/sf-retro-save-portability"
VERSION="0.1.0"
BASE="https://github.com/$REPOSITORY/releases/latest/download"
INSTALL_TMP="$(mktemp -d)"
trap 'rm -rf "$INSTALL_TMP"' EXIT INT TERM

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64|Linux-amd64)
    FILE="retro-save-portability_${VERSION}_linux-x64.AppImage"
    DESTINATION="${XDG_BIN_HOME:-$HOME/.local/bin}/retro-save-portability"
    ;;
  Darwin-arm64)
    FILE="retro-save-portability_${VERSION}_macos-arm64.dmg"
    ;;
  Darwin-x86_64)
    FILE="retro-save-portability_${VERSION}_macos-x64.dmg"
    ;;
  *)
    echo "Unsupported platform. Download an installer from $BASE" >&2
    exit 1
    ;;
esac

echo "Downloading $FILE"
curl -fL "$BASE/$FILE" -o "$INSTALL_TMP/$FILE"
curl -fL "$BASE/SHA256SUMS" -o "$INSTALL_TMP/SHA256SUMS"
EXPECTED="$(awk -v file="$FILE" '$2 == file { print $1 }' "$INSTALL_TMP/SHA256SUMS")"
if [ -z "$EXPECTED" ]; then
  echo "No checksum was published for $FILE; refusing to install." >&2
  exit 1
fi
ACTUAL="$(shasum -a 256 "$INSTALL_TMP/$FILE" | awk '{print $1}')"
if [ "$ACTUAL" != "$EXPECTED" ]; then
  echo "SHA-256 mismatch; refusing to install." >&2
  exit 1
fi
echo "SHA-256 verified: $ACTUAL"

if [ "$(uname -s)" = "Linux" ]; then
  mkdir -p "$(dirname "$DESTINATION")"
  install -m 755 "$INSTALL_TMP/$FILE" "$DESTINATION"
  echo "Installed Retro Save Portability to $DESTINATION"
  case ":$PATH:" in *":$(dirname "$DESTINATION"):"*) ;; *) echo "Add $(dirname "$DESTINATION") to PATH to launch it from a terminal." ;; esac
else
  MOUNT="$INSTALL_TMP/mount"
  mkdir -p "$MOUNT"
  hdiutil attach "$INSTALL_TMP/$FILE" -nobrowse -mountpoint "$MOUNT" >/dev/null
  APP="$(find "$MOUNT" -maxdepth 1 -name '*.app' -print -quit)"
  if [ -z "$APP" ]; then
    hdiutil detach "$MOUNT" >/dev/null
    echo "The disk image did not contain an app." >&2
    exit 1
  fi
  cp -R "$APP" /Applications/
  hdiutil detach "$MOUNT" >/dev/null
  echo "Installed Retro Save Portability in /Applications. The unsigned first launch may require right-click → Open."
fi
