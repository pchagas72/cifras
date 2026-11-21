#!/usr/bin/env python3
"""Adiciona um filme em data/movies.json."""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "movies.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Adiciona um filme à lista compartilhada (data/movies.json).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--title", required=True, help="Nome do filme")
    parser.add_argument("--title-url", default="", help="Link do filme")
    parser.add_argument("--year", required=True, type=int, help="Ano de lançamento")
    parser.add_argument("--director", required=True, help="Nome do diretor")
    parser.add_argument("--director-url", default="", help="Link do diretor")
    parser.add_argument("--subtitles", required=True, help="Nome/fonte das legendas")
    parser.add_argument("--subtitles-url", default="", help="Link das legendas")
    parser.add_argument("--by", required=True, dest="recommended_by", help="Quem recomendou")
    parser.add_argument(
        "--watched",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Marca o filme como já visto (--watched / --no-watched)",
    )
    return parser.parse_args()


def load_movies() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit("data/movies.json precisa ser uma lista JSON.")
    return data


def save_movies(movies: list[dict]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("w", encoding="utf-8") as handle:
        json.dump(movies, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def main() -> int:
    args = parse_args()

    movie = {
        "id": str(uuid.uuid4()),
        "title": args.title.strip(),
        "titleUrl": args.title_url.strip(),
        "year": args.year,
        "director": args.director.strip(),
        "directorUrl": args.director_url.strip(),
        "subtitles": args.subtitles.strip(),
        "subtitlesUrl": args.subtitles_url.strip(),
        "recommendedBy": args.recommended_by.strip(),
        "watched": bool(args.watched),
    }

    if movie["year"] < 1888:
        print("Ano inválido.", file=sys.stderr)
        return 1

    movies = load_movies()
    movies.append(movie)
    movies.sort(
        key=lambda item: (
            bool(item.get("watched")),
            -int(item.get("year", 0)),
            str(item.get("title", "")),
        )
    )
    save_movies(movies)

    status = "visto" if movie["watched"] else "não visto"
    print(f"Adicionado: {movie['title']} ({movie['year']}) — {status}")
    print(f"Arquivo: {DATA_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
