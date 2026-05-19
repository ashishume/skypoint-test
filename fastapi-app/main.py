import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/appdb")
engine = create_engine(DATABASE_URL)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS items (
                id   SERIAL PRIMARY KEY,
                name TEXT NOT NULL
            )
        """))
        conn.commit()


class ItemCreate(BaseModel):
    name: str


@app.get("/api/items")
def get_items():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, name FROM items ORDER BY id"))
        return [{"id": r.id, "name": r.name} for r in rows]


@app.post("/api/items", status_code=201)
def create_item(body: ItemCreate):
    with engine.connect() as conn:
        row = conn.execute(
            text("INSERT INTO items (name) VALUES (:name) RETURNING id, name"),
            {"name": body.name},
        ).fetchone()
        conn.commit()
        return {"id": row.id, "name": row.name}


@app.delete("/api/items/{item_id}", status_code=204)
def delete_item(item_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("DELETE FROM items WHERE id = :id"), {"id": item_id}
        )
        conn.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
