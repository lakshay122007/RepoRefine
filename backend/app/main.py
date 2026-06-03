from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .analytics import aggregate_activity
from .github_graphql import GitHubGraphQLError, fetch_github_analytics
from .scoring import score_recruiter_readiness

app = FastAPI(title="RepoRefine Analytics API", version="0.2.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/analyze/{username}")
async def analyze_developer(username: str) -> dict:
    try:
        user_data = await fetch_github_analytics(username)
        aggregated = aggregate_activity(user_data)
        scoring = score_recruiter_readiness(aggregated)
        return {
            "developer": aggregated["profile"],
            "analytics": {
                "repository_count": aggregated["repository_count"],
                "commit_count_sample": aggregated["commit_count_sample"],
                "total_contributions_last_year": aggregated["total_contributions_last_year"],
                "inactive_repository_count": aggregated["inactive_repository_count"],
                "top_languages": aggregated["top_languages"],
                "repository_summaries": aggregated["repository_summaries"],
                "red_flags": aggregated["red_flags"],
            },
            "recruiter_readiness": scoring,
        }
    except GitHubGraphQLError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
