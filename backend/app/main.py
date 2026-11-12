from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.diagrams import router as diagrams_router
from app.config import Settings
from app.database import create_database_engine, create_session_factory
from app.models import Base


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or Settings()
    engine = create_database_engine(app_settings.database_url)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        Base.metadata.create_all(bind=engine)
        yield
        engine.dispose()

    application = FastAPI(
        title="LearnLLD API",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.state.engine = engine
    application.state.session_factory = create_session_factory(engine)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.allowed_frontend_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @application.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    application.include_router(diagrams_router)
    return application


app = create_app()
