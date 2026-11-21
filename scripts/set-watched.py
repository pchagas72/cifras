#!/usr/bin/env python3
"""Marca (ou desmarca) um filme como visto em data/movies.json."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "movies.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Atualiza o campo watched de um filme em data/movies.json.",
    )
    parser.add_argument("title", help="Título (ou parte do título) do filme")
    parser.add_argument(
        "--watched",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Define como visto (--watched) ou não visto (--no-watched)",
    )
    return parser.parse_args()


def load_movies() -> list[dict]:
    if not DATA_FILE.exists():
        raise SystemExit("data/movies.json não existe.")
    with DATA_FILE.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise SystemExit("data/movies.json precisa ser uma lista JSON.")
    return data


def main() -> int:
    args = parse_args()
    needle = args.title.strip().casefold()
    movies = load_movies()
    matches = [
        movie
        for movie in movies
        if needle in str(movie.get("title", "")).casefold()
    ]

    if not matches:
        print(f'Nenhum filme encontrado para "{args.title}".', file=sys.stderr)
        return 1

    if len(matches) > 1:
        print("Vários filmes correspondem; seja mais específico:", file=sys.stderr)
        for movie in matches:
            print(f'- {movie.get("title")} ({movie.get("year")})', file=sys.stderr)
        return 1

    movie = matches[0]
    movie["watched"] = bool(args.watched)

    with DATA_FILE.open("w", encoding="utf-8") as handle:
        json.dump(movies, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    status = "visto" if movie["watched"] else "não visto"
    print(f'{movie["title"]}: {status}')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
