#!/bin/bash

# Step 1: Capture the latest version
latest_version=$(grep -oP '\[\K[0-9]+\.[0-9]+\.[0-9]+(?=\])' CHANGELOG.md | head -1)
echo "Latest version: $latest_version"

# Step 2: Bump the patch version
IFS='.' read -r -a version_parts <<< "$latest_version"
let version_parts[2]+=1
new_version="${version_parts[0]}.${version_parts[1]}.${version_parts[2]}"
echo "New version: $new_version"

# Step 3: Construct the version comparison URL
comparison_url="https://github.com/o1-labs/zkapp-cli/compare/${latest_version}...${new_version}"
echo "Comparison URL: $comparison_url"

# Step 4: Capture the current date
current_date=$(date +%Y-%m-%d)
echo "Current date: $current_date"

# Step 5: Update the CHANGELOG
# Insert a new version section with an additional newline for spacing
sed -i "/## Unreleased/a \\\n## [$new_version]($comparison_url) - $current_date" CHANGELOG.md

echo "CHANGELOG updated with version $new_version"
