import type { UMLDiagram } from "../diagram/types";

export type DiagramPayload = UMLDiagram & { title: string };

export type DiagramSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedDiagram = DiagramSummary & UMLDiagram;

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

type ApiErrorBody = { detail?: unknown };

function errorMessage(detail: unknown, statusCode: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((issue) =>
        typeof issue === "object" && issue !== null && "msg" in issue
          ? String(issue.msg)
          : null,
      )
      .filter((message): message is string => message !== null);
    if (messages.length > 0) return messages.join("; ");
  }
  return `API request failed (${statusCode})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      | ApiErrorBody
      | undefined;
    throw new Error(errorMessage(body?.detail, response.status));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function listDiagrams(): Promise<DiagramSummary[]> {
  return request<DiagramSummary[]>("/api/diagrams");
}

export function createDiagram(payload: DiagramPayload): Promise<SavedDiagram> {
  return request<SavedDiagram>("/api/diagrams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getDiagram(diagramId: string): Promise<SavedDiagram> {
  return request<SavedDiagram>(`/api/diagrams/${encodeURIComponent(diagramId)}`);
}

export function saveDiagram(
  diagramId: string,
  payload: DiagramPayload,
): Promise<SavedDiagram> {
  return request<SavedDiagram>(`/api/diagrams/${encodeURIComponent(diagramId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteDiagram(diagramId: string): Promise<void> {
  return request<void>(`/api/diagrams/${encodeURIComponent(diagramId)}`, {
    method: "DELETE",
  });
}
