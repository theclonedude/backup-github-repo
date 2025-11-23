#!/usr/bin/env bash
set -e

include_html=true
include_json=true

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --help)
            echo "USAGE: backup-github-repo [--no-html] [URL]"
            exit 1
            ;;

        --no-json)
            include_json=false
            ;;

        --no-html)
            include_html=false
            ;;

        *)
            url="${1}"
            ;;
    esac
    shift
done

[ -e ".git" ] || [ "$url" != "" ] || {
  echo "this isn't a git repository and no repository URL was passed" && exit 1
}

if [ "$url" != "" ] ; then
  folder_name=$(backup-github-repo_get_repository_name "$url" | sed 's|/|_|g')
else
  folder_name="repo-backup"
fi

mkdir -p "${folder_name}/html/assets"
mkdir -p "${folder_name}/html"

# Executables declared in package.json
backup-github-repo_init_config
${include_json} && download-github-repo-json "$folder_name" "$url"
${include_html} && download-github-repo-html "$folder_name" "$url"
