from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def client(tmp_path) -> Iterator[TestClient]:
    test_database = tmp_path / "learnlld-test.db"
    settings = Settings(
        database_url=f"sqlite:///{test_database}",
        frontend_origins="http://localhost:5173",
    )
    application = create_app(settings)
    with TestClient(application) as test_client:
        yield test_client
