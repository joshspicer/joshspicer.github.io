#!/usr/bin/env python3
"""
Script to create GitHub Discussions for blog posts.

This script:
1. Scans all posts in the _posts directory
2. Checks if a discussion already exists for each post
3. Creates a new discussion if one doesn't exist via gh CLI
4. Updates the _data/discussions.yml file with discussion URLs
"""

import os
import re
import yaml
import json
import subprocess
from pathlib import Path

def extract_front_matter(post_path):
    """Extract YAML front matter from a markdown file."""
    with open(post_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match YAML front matter
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except yaml.YAMLError as e:
            print(f"Error parsing front matter in {post_path}: {e}")
            return {}
    return {}

def get_post_slug(filename):
    """Extract the slug from a post filename (e.g., 2025-01-11-btle-ha.md -> btle-ha)."""
    # Remove date prefix and .md extension
    match = re.match(r'\d{4}-\d{2}-\d{2}-(.+)\.md$', filename)
    if match:
        return match.group(1)
    return filename.replace('.md', '')

def create_discussion_body(post_url, post_title, post_date):
    """Create the body text for a discussion."""
    return f"""This is an automated discussion thread for the blog post: **[{post_title}]({post_url})**

Published: {post_date}

Feel free to leave comments, questions, or feedback about this post!"""

def get_discussion_category_id(repo_name):
    """Get the 'General' discussion category ID, or the first available category."""
    try:
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={{repository(owner:"{repo_name.split("/")[0]}", name:"{repo_name.split("/")[1]}") {{ discussionCategories(first:10) {{ nodes {{ id name }} }} }} }}'],
            capture_output=True,
            text=True,
            check=True
        )

        data = json.loads(result.stdout)
        categories = data.get('data', {}).get('repository', {}).get('discussionCategories', {}).get('nodes', [])

        # Try to find 'General' category first
        for cat in categories:
            if cat['name'].lower() == 'general':
                return cat['id']

        # Return first category if 'General' not found
        if categories:
            return categories[0]['id']

        print("Error: No discussion categories found")
        return None

    except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as e:
        print(f"Error getting discussion categories: {e}")
        return None

def create_discussion(repo_name, category_id, title, body):
    """Create a discussion using gh CLI."""
    try:
        # Get repository ID first
        result = subprocess.run(
            ['gh', 'api', 'graphql', '-f', f'query={{repository(owner:"{repo_name.split("/")[0]}", name:"{repo_name.split("/")[1]}") {{ id }} }}'],
            capture_output=True,
            text=True,
            check=True
        )

        data = json.loads(result.stdout)
        repo_id = data['data']['repository']['id']

        # Create the discussion
        mutation = """
        mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
          createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
            discussion {
              id
              url
              number
            }
          }
        }
        """

        result = subprocess.run(
            ['gh', 'api', 'graphql',
             '-f', f'query={mutation}',
             '-F', f'repositoryId={repo_id}',
             '-F', f'categoryId={category_id}',
             '-F', f'title={title}',
             '-F', f'body={body}'],
            capture_output=True,
            text=True,
            check=True
        )

        data = json.loads(result.stdout)
        discussion = data.get('data', {}).get('createDiscussion', {}).get('discussion', {})

        return {
            'url': discussion.get('url'),
            'number': discussion.get('number')
        }

    except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as e:
        print(f"Error creating discussion: {e}")
        if hasattr(e, 'stderr'):
            print(f"stderr: {e.stderr}")
        return None

def main():
    repo_name = os.environ.get('REPOSITORY')

    if not repo_name:
        print("Error: REPOSITORY environment variable must be set")
        return 1

    # Load existing discussions data
    discussions_file = Path('_data/discussions.yml')
    discussions_file.parent.mkdir(exist_ok=True)

    if discussions_file.exists():
        with open(discussions_file, 'r', encoding='utf-8') as f:
            discussions_data = yaml.safe_load(f) or {}
    else:
        discussions_data = {}

    # Get discussion category ID
    category_id = get_discussion_category_id(repo_name)
    if not category_id:
        print("Error: Could not get discussion category ID")
        return 1

    print(f"Using category ID: {category_id}")

    # Scan all posts
    posts_dir = Path('_posts')
    posts = sorted(posts_dir.glob('*.md'))

    print(f"\nFound {len(posts)} posts")

    created_count = 0
    skipped_count = 0

    for post_path in posts:
        filename = post_path.name
        slug = get_post_slug(filename)

        # Skip if this post already has a discussion
        if slug in discussions_data and discussions_data[slug].get('url'):
            print(f"✓ Discussion already exists for {slug}")
            skipped_count += 1
            continue

        # Extract front matter
        front_matter = extract_front_matter(post_path)

        if not front_matter:
            print(f"⚠ Skipping {filename} - no front matter found")
            continue

        title = front_matter.get('title', slug)
        date = front_matter.get('date', 'Unknown date')
        permalink = front_matter.get('permalink', slug)

        # Construct the post URL
        post_url = f"https://joshspicer.com/{permalink}"

        # Create discussion title
        discussion_title = f"Discussion: {title}"
        discussion_body = create_discussion_body(post_url, title, date)

        print(f"\n→ Creating discussion for: {title}")
        print(f"  Slug: {slug}")
        print(f"  URL: {post_url}")

        # Create the discussion
        discussion = create_discussion(repo_name, category_id, discussion_title, discussion_body)

        if discussion and discussion.get('url'):
            print(f"  ✓ Created discussion: {discussion['url']}")
            discussions_data[slug] = {
                'url': discussion['url'],
                'number': discussion['number'],
                'title': discussion_title
            }
            created_count += 1
        else:
            print(f"  ✗ Failed to create discussion")

    # Save discussions data
    with open(discussions_file, 'w', encoding='utf-8') as f:
        yaml.dump(discussions_data, f, default_flow_style=False, sort_keys=True)

    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Created: {created_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Total tracked: {len(discussions_data)}")
    print(f"  Data file: {discussions_file}")
    print(f"{'='*60}")

    return 0

if __name__ == '__main__':
    exit(main())
