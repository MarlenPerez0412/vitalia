"""Proxy de Entretenimiento: Angular -> FastAPI -> API externa.

Las claves viven solo en `backend/.env`. Sin clave devuelve `source: "unconfigured"` y Angular usa su catalogo local;
si la API externa falla responde 502 y Angular muestra el catalogo local con un aviso amable. Aislado de `/api/voice`.
"""
import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger("vitalia.entertainment")
router = APIRouter(prefix="/api/entertainment", tags=["entertainment"])

TIMEOUT_SECONDS = 4.0
LIMIT = 8
UNCONFIGURED: dict[str, Any] = {"source": "unconfigured", "items": []}


async def fetch_json(url: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> dict[str, Any]:
    """Unico punto de salida a Internet (se reemplaza en las pruebas)."""
    async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
        response = await client.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()


async def guarded(request: Request, key: str, build) -> dict[str, Any]:
    if not key:
        return UNCONFIGURED
    try:
        return {"source": "live", "items": (await build(key))[:LIMIT]}
    except Exception as exc:  # noqa: BLE001 - cualquier fallo externo se traduce en 502 sin detalles tecnicos
        logger.warning("Fallo la API externa de %s: %s", request.url.path, type(exc).__name__)
        raise HTTPException(status_code=502, detail="No fue posible actualizar el contenido.") from exc


@router.get("/movies")
async def movies(request: Request) -> dict[str, Any]:
    async def build(key: str) -> list[dict[str, Any]]:
        headers = {"Authorization": f"Bearer {key}"} if key.startswith("eyJ") else None
        params: dict[str, Any] = {"language": "es-MX"} | ({} if headers else {"api_key": key})
        genres = {g["id"]: g["name"] for g in (await fetch_json("https://api.themoviedb.org/3/genre/movie/list", params, headers)).get("genres", [])}
        data = await fetch_json("https://api.themoviedb.org/3/movie/popular", params, headers)
        return [
            {
                "id": str(m["id"]),
                "title": m["title"],
                "year": int(m["release_date"][:4]) if m.get("release_date") else 0,
                "genre": next((genres[i] for i in m.get("genre_ids", []) if i in genres), "Cine"),
                "synopsis": (m.get("overview") or "Sin descripción disponible.")[:160],
                "details": m.get("overview") or "Sin descripción disponible.",
                "poster": f"https://image.tmdb.org/t/p/w185{m['poster_path']}" if m.get("poster_path") else None,
            }
            for m in data.get("results", [])
            if not m.get("adult")
        ]

    return await guarded(request, request.app.state.settings.tmdb_api_key, build)


@router.get("/events")
async def events(request: Request) -> dict[str, Any]:
    async def build(key: str) -> list[dict[str, Any]]:
        params = {"apikey": key, "classificationName": "arts & theatre", "countryCode": "MX", "locale": "es", "size": LIMIT}
        data = await fetch_json("https://app.ticketmaster.com/discovery/v2/events.json", params)
        items = []
        for e in data.get("_embedded", {}).get("events", []):
            venue = (e.get("_embedded", {}).get("venues") or [{}])[0]
            start = e.get("dates", {}).get("start", {})
            items.append({
                "id": e["id"],
                "name": e["name"],
                "type": (e.get("classifications") or [{}])[0].get("segment", {}).get("name", "Cultura"),
                "date": start.get("localDate", ""),
                "time": (start.get("localTime") or "")[:5],
                "venue": venue.get("name", "Por confirmar"),
                "city": venue.get("city", {}).get("name", ""),
                "description": e.get("info") or e.get("pleaseNote") or "Evento cultural. Consulta el sitio para más información.",
                "url": e.get("url"),
            })
        return items

    return await guarded(request, request.app.state.settings.ticketmaster_api_key, build)


@router.get("/news")
async def news(request: Request) -> dict[str, Any]:
    async def build(key: str) -> list[dict[str, Any]]:
        data = await fetch_json(
            "https://newsapi.org/v2/top-headlines",
            {"country": "mx", "category": "health", "pageSize": LIMIT},
            {"X-Api-Key": key},
        )
        return [
            {
                "id": str(i),
                "title": a["title"],
                "summary": a.get("description") or "Consulta la nota completa para más información.",
                "details": a.get("description") or a.get("content") or "",
                "source": (a.get("source") or {}).get("name", "Fuente externa"),
                "date": (a.get("publishedAt") or "")[:10],
                "category": "Bienestar",
                "url": a.get("url"),
            }
            for i, a in enumerate(data.get("articles", []))
            if a.get("title") and a["title"] != "[Removed]"
        ]

    return await guarded(request, request.app.state.settings.news_api_key, build)


@router.get("/music")
async def music(request: Request) -> dict[str, Any]:
    async def build(key: str) -> list[dict[str, Any]]:
        data = await fetch_json(
            "https://www.googleapis.com/youtube/v3/search",
            {"part": "snippet", "type": "video", "videoCategoryId": "10", "q": "boleros música mexicana clásica instrumental", "maxResults": LIMIT, "safeSearch": "strict", "key": key},
        )
        return [
            {
                "id": v["id"]["videoId"],
                "title": v["snippet"]["title"],
                "artist": v["snippet"]["channelTitle"],
                "category": "Música",
                "url": f"https://www.youtube.com/watch?v={v['id']['videoId']}",
                "thumbnail": (v["snippet"].get("thumbnails", {}).get("medium") or {}).get("url"),
            }
            for v in data.get("items", [])
            if v.get("id", {}).get("videoId")
        ]

    return await guarded(request, request.app.state.settings.youtube_api_key, build)
