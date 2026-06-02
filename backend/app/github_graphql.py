from __future__ import annotations

import os
from typing import Any

import httpx

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

ANALYTICS_QUERY = """
query($username: String!) {
  user(login: $username) {
    login
    name
    avatarUrl
    bio
    followers { totalCount }
    contributionsCollection {
      contributionCalendar {
        totalContributions
      }
      commitContributionsByRepository(maxRepositories: 25) {
        repository {
          name
          stargazerCount
          forkCount
          primaryLanguage { name }
        }
        contributions(first: 100) {
          totalCount
          nodes {
            occurredAt
            commitCount
          }
        }
      }
    }
    repositories(first: 50, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}) {
      totalCount
      nodes {
        name
        description
        stargazerCount
        forkCount
        pushedAt
        primaryLanguage { name }
        licenseInfo { name }
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100) {
                nodes {
                  committedDate
                  messageHeadline
                }
              }
            }
          }
        }
      }
    }
  }
}
"""


class GitHubGraphQLError(RuntimeError):
    pass


async def fetch_github_analytics(username: str) -> dict[str, Any]:
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise GitHubGraphQLError("Missing GITHUB_TOKEN environment variable")

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }
    payload = {"query": ANALYTICS_QUERY, "variables": {"username": username}}

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(GITHUB_GRAPHQL_URL, headers=headers, json=payload)

    if response.status_code >= 400:
        raise GitHubGraphQLError(f"GitHub GraphQL request failed with status {response.status_code}")

    data = response.json()
    if data.get("errors"):
        msg = data["errors"][0].get("message", "Unknown GitHub GraphQL error")
        raise GitHubGraphQLError(msg)

    user = data.get("data", {}).get("user")
    if not user:
        raise GitHubGraphQLError(f"GitHub user '{username}' not found")

    return user
