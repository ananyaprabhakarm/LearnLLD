from fastapi.testclient import TestClient


def diagram_payload() -> dict:
    return {
        "title": "Order Management",
        "classes": [
            {
                "id": "class-user",
                "name": "User",
                "position": {"x": 170, "y": 110},
                "attributes": [
                    {"id": "attr-user-id", "name": "id", "type": "string"}
                ],
                "methods": [
                    {
                        "id": "method-place-order",
                        "name": "placeOrder",
                        "returnType": "Order",
                    }
                ],
            },
            {
                "id": "class-order",
                "name": "Order",
                "position": {"x": 500, "y": 260},
                "attributes": [],
                "methods": [],
            },
        ],
        "relationships": [
            {
                "id": "rel-user-order",
                "sourceId": "class-user",
                "targetId": "class-order",
                "kind": "association",
            }
        ],
    }


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_configured_vite_origin(client: TestClient) -> None:
    response = client.options(
        "/api/diagrams",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_create_list_and_retrieve_diagram(client: TestClient) -> None:
    payload = diagram_payload()
    created = client.post("/api/diagrams", json=payload)

    assert created.status_code == 201
    saved = created.json()
    assert saved["id"]
    assert saved["title"] == payload["title"]
    assert saved["classes"] == payload["classes"]
    assert saved["relationships"] == payload["relationships"]
    assert saved["createdAt"]
    assert saved["updatedAt"]

    listing = client.get("/api/diagrams")
    assert listing.status_code == 200
    assert listing.json() == [
        {
            "id": saved["id"],
            "title": payload["title"],
            "createdAt": saved["createdAt"],
            "updatedAt": saved["updatedAt"],
        }
    ]

    retrieved = client.get(f"/api/diagrams/{saved['id']}")
    assert retrieved.status_code == 200
    assert retrieved.json() == saved


def test_update_diagram_replaces_title_and_complete_content(client: TestClient) -> None:
    created = client.post("/api/diagrams", json=diagram_payload())
    diagram_id = created.json()["id"]
    changed_payload = diagram_payload()
    changed_payload["title"] = "Updated Order Model"
    changed_payload["classes"][0]["position"] = {"x": 222, "y": 333}
    changed_payload["relationships"] = []

    updated = client.put(f"/api/diagrams/{diagram_id}", json=changed_payload)

    assert updated.status_code == 200
    assert updated.json()["id"] == diagram_id
    assert updated.json()["title"] == "Updated Order Model"
    assert updated.json()["classes"][0]["position"] == {"x": 222.0, "y": 333.0}
    assert updated.json()["relationships"] == []


def test_delete_diagram(client: TestClient) -> None:
    created = client.post("/api/diagrams", json=diagram_payload())
    diagram_id = created.json()["id"]

    deleted = client.delete(f"/api/diagrams/{diagram_id}")

    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get(f"/api/diagrams/{diagram_id}").status_code == 404


def test_missing_diagram_returns_404_for_read_update_and_delete(client: TestClient) -> None:
    diagram_id = "missing-diagram"

    assert client.get(f"/api/diagrams/{diagram_id}").status_code == 404
    assert client.put(
        f"/api/diagrams/{diagram_id}", json=diagram_payload()
    ).status_code == 404
    assert client.delete(f"/api/diagrams/{diagram_id}").status_code == 404


def test_rejects_relationships_to_unknown_class(client: TestClient) -> None:
    payload = diagram_payload()
    payload["relationships"][0]["targetId"] = "not-a-class"

    response = client.post("/api/diagrams", json=payload)

    assert response.status_code == 422
    assert "unknown target class 'not-a-class'" in str(response.json()["detail"])


def test_rejects_malformed_payload_and_unknown_fields(client: TestClient) -> None:
    payload = diagram_payload()
    del payload["classes"][0]["position"]
    payload["unexpected"] = "must not be silently ignored"

    response = client.post("/api/diagrams", json=payload)

    assert response.status_code == 422
    errors = str(response.json()["detail"])
    assert "position" in errors
    assert "unexpected" in errors


def test_rejects_duplicate_class_ids(client: TestClient) -> None:
    payload = diagram_payload()
    payload["classes"][1]["id"] = payload["classes"][0]["id"]

    response = client.post("/api/diagrams", json=payload)

    assert response.status_code == 422
    assert "class IDs must be unique" in str(response.json()["detail"])


def test_rejects_duplicate_relationship_ids(client: TestClient) -> None:
    payload = diagram_payload()
    duplicate = dict(payload["relationships"][0])
    duplicate["sourceId"] = "class-order"
    duplicate["targetId"] = "class-user"
    payload["relationships"].append(duplicate)

    response = client.post("/api/diagrams", json=payload)

    assert response.status_code == 422
    assert "relationship IDs must be unique" in str(response.json()["detail"])
