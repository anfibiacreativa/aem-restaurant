#!/bin/bash
# Push FlAIvors restaurant content to DA (Document Authoring) storage
# Usage: ./push-to-da.sh <DA_TOKEN> [--skip-media | --only-page <path> ...]
#
# Get your token:
#   1. Go to https://da.live
#   2. Sign in
#   3. Open browser DevTools → Network tab
#   4. Navigate to your site files
#   5. Find any request to admin.da.live → copy the Authorization: Bearer <token>

set -euo pipefail

ORG="anfibiacreativa"
REPO="aem-restaurant"
API="https://admin.da.live/source/${ORG}/${REPO}"

SKIP_MEDIA=0
DO_PREVIEW=0
BRANCH="main"
ONLY_PAGES=()
TOKEN=""

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-media) SKIP_MEDIA=1; shift ;;
    --preview) DO_PREVIEW=1; shift ;;
    --branch)
      shift
      BRANCH="${1:-main}"
      shift
      ;;
    --branch=*)
      BRANCH="${1#*=}"
      shift
      ;;
    --only-page)
      shift
      _OP="${1:-}"
      if [ -z "$_OP" ] || [[ "$_OP" == --* ]]; then
        echo "Error: --only-page requires a file path"
        exit 1
      fi
      ONLY_PAGES+=("$_OP")
      shift
      ;;
    --only-page=*)
      ONLY_PAGES+=("${1#*=}")
      shift
      ;;
    -h|--help)
      echo "Usage: $0 <DA_BEARER_TOKEN> [options]"
      echo "  --skip-media              Push HTML only; no media uploads."
      echo "  --preview                 Preview pages on EDS after uploading."
      echo "  --branch <name>           Git branch for preview (default: main)."
      echo "  --only-page <path>        Upload one specific page (repeatable)."
      echo "  --only-page=<path>        Same as above."
      exit 0
      ;;
    *)
      TOKEN="$1"
      shift
      ;;
  esac
done

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <DA_BEARER_TOKEN> [--skip-media | --only-page <path>]"
  echo ""
  echo "Get your token from DA:"
  echo "  1. Sign in at https://da.live"
  echo "  2. Open DevTools > Network > find a request to admin.da.live"
  echo "  3. Copy the Bearer token from the Authorization header"
  exit 1
fi

# Content HTML files to push (from drafts/ folder)
# DA expects: <body><header/><main>...</main><footer/></body>
declare -a PAGES=(
  "nav.html"
  "footer.html"
  "index.html"
  "about/index.html"
  "menu/index.html"
)

# Media files
MEDIA_FILES=()
if [ "$SKIP_MEDIA" = "0" ] && [ -d media ]; then
  while IFS= read -r f; do
    [ -n "$f" ] && MEDIA_FILES+=("$f")
  done < <(find media -maxdepth 1 -type f \
    ! -name '.DS_Store' \
    ! -name '._*' \
    \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' \
    -o -iname '*.mp4' -o -iname '*.webm' -o -iname '*.mov' -o -iname '*.svg' \) \
    -print 2>/dev/null | LC_ALL=C sort)
fi

# Specific pages only
if [ "${#ONLY_PAGES[@]}" -gt 0 ]; then
  for _p in "${ONLY_PAGES[@]}"; do
    if [ ! -f "$_p" ]; then
      echo "Error: --only-page file not found: $_p"
      exit 1
    fi
  done
  PAGES=("${ONLY_PAGES[@]}")
  MEDIA_FILES=()
fi

TOTAL=$(( ${#PAGES[@]} + ${#MEDIA_FILES[@]} ))
SUCCESS=0
FAIL=0

echo "=========================================="
echo " Pushing ${TOTAL} item(s) to DA"
echo " Org: ${ORG} / Repo: ${REPO}"
if [ "$SKIP_MEDIA" = "1" ]; then
  echo " Mode: --skip-media"
elif [ "${#ONLY_PAGES[@]}" -gt 0 ]; then
  echo " Mode: --only-page (${ONLY_PAGES[*]})"
fi
echo "=========================================="
echo ""

for page in "${PAGES[@]+"${PAGES[@]}"}"; do
  FILE_PATH="$page"

  if [ ! -f "$FILE_PATH" ]; then
    echo "SKIP: $FILE_PATH (not found)"
    ((FAIL++))
    continue
  fi

  # DA target is the same as the file path (root-level content)
  DA_TARGET="$page"

  # Read the HTML content from disk
  CONTENT=$(cat "$FILE_PATH")

  # Wrap in <body> if not already wrapped
  if [[ "$CONTENT" != *"<body>"* ]]; then
    CONTENT="<body>
${CONTENT}
</body>"
  fi

  # Create a temp file with the wrapped content
  TMPFILE=$(mktemp /tmp/da-upload-XXXXXX.html)
  echo "$CONTENT" > "$TMPFILE"

  # Create parent folders if needed
  DIR_PATH=$(dirname "$DA_TARGET")
  if [ "$DIR_PATH" != "." ]; then
    curl -s -o /dev/null -w "" \
      -X POST "${API}/${DIR_PATH}" \
      -H "Authorization: Bearer ${TOKEN}" \
      2>/dev/null || true
  fi

  # Upload via POST multipart/form-data
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${API}/${DA_TARGET}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -F "data=@${TMPFILE};type=text/html")

  rm -f "$TMPFILE"

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "  OK: ${DA_TARGET} (${HTTP_CODE})"
    ((SUCCESS++))
  else
    echo "FAIL: ${DA_TARGET} (HTTP ${HTTP_CODE})"
    ((FAIL++))
  fi
done

for media in "${MEDIA_FILES[@]+"${MEDIA_FILES[@]}"}"; do
  FILE_PATH="$media"

  if [ ! -f "$FILE_PATH" ]; then
    echo "SKIP: $FILE_PATH (not found)"
    ((FAIL++))
    continue
  fi

  DIR_PATH=$(dirname "$media")
  if [ "$DIR_PATH" != "." ]; then
    curl -s -o /dev/null -w "" \
      -X POST "${API}/${DIR_PATH}" \
      -H "Authorization: Bearer ${TOKEN}" \
      2>/dev/null || true
  fi

  MIME_TYPE=$(file --mime-type -b "$FILE_PATH")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${API}/${media}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -F "data=@${FILE_PATH};type=${MIME_TYPE}")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "  OK: ${media} (${HTTP_CODE})"
    ((SUCCESS++))
  else
    echo "FAIL: ${media} (HTTP ${HTTP_CODE})"
    ((FAIL++))
  fi
done

echo ""
echo "=========================================="
echo " Done: ${SUCCESS}/${TOTAL} succeeded, ${FAIL} failed"
echo "=========================================="

if [ "$SUCCESS" -gt 0 ]; then
  echo ""
  echo "DA edit: https://da.live/#/${ORG}/${REPO}"

  if [ "$DO_PREVIEW" = "1" ]; then
    echo ""
    echo "=========================================="
    echo " Previewing pages on EDS"
    echo "=========================================="
    PREVIEW_OK=0
    PREVIEW_FAIL=0
    for page in "${PAGES[@]+"${PAGES[@]}"}"; do
      PREV_PATH="${page%.html}"
      PREV_PATH="${PREV_PATH%/index}"
      [ -z "$PREV_PATH" ] && PREV_PATH="index"
      PREV_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "https://admin.hlx.page/preview/${ORG}/${REPO}/${BRANCH}/${PREV_PATH}" \
        -H "Authorization: Bearer ${TOKEN}")
      if [ "$PREV_CODE" = "200" ] || [ "$PREV_CODE" = "201" ] || [ "$PREV_CODE" = "204" ]; then
        echo "  OK: preview/${PREV_PATH} (${PREV_CODE})"
        ((PREVIEW_OK++))
      else
        echo "FAIL: preview/${PREV_PATH} (HTTP ${PREV_CODE})"
        ((PREVIEW_FAIL++))
      fi
    done
    echo ""
    echo "Preview results: ${PREVIEW_OK} ok, ${PREVIEW_FAIL} failed"
  fi

  echo ""
  echo "Preview: https://${BRANCH}--${REPO}--${ORG}.aem.page/"
fi
