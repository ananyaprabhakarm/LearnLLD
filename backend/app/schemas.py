from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _must_not_be_blank(value: str) -> str:
    if not value.strip():
        raise ValueError("value must contain at least one non-space character")
    return value


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Position(ApiModel):
    x: float = Field(allow_inf_nan=False)
    y: float = Field(allow_inf_nan=False)


class UMLAttribute(ApiModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=120)
    type: str = Field(min_length=1, max_length=120)

    @field_validator("id", "name", "type")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return _must_not_be_blank(value)


class UMLMethod(ApiModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=120)
    return_type: str = Field(alias="returnType", min_length=1, max_length=120)

    @field_validator("id", "name", "return_type")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return _must_not_be_blank(value)


class UMLClass(ApiModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=160)
    position: Position
    attributes: list[UMLAttribute]
    methods: list[UMLMethod]

    @field_validator("id", "name")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return _must_not_be_blank(value)


RelationshipKind = Literal[
    "inheritance",
    "association",
    "aggregation",
    "composition",
    "dependency",
]


class UMLRelationship(ApiModel):
    id: str = Field(min_length=1, max_length=100)
    source_id: str = Field(alias="sourceId", min_length=1, max_length=100)
    target_id: str = Field(alias="targetId", min_length=1, max_length=100)
    kind: RelationshipKind

    @field_validator("id", "source_id", "target_id")
    @classmethod
    def validate_text(cls, value: str) -> str:
        return _must_not_be_blank(value)


class DiagramPayload(ApiModel):
    title: str = Field(min_length=1, max_length=200)
    classes: list[UMLClass]
    relationships: list[UMLRelationship]

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        return _must_not_be_blank(value)

    @model_validator(mode="after")
    def references_must_be_valid(self) -> "DiagramPayload":
        class_ids = [diagram_class.id for diagram_class in self.classes]
        if len(class_ids) != len(set(class_ids)):
            raise ValueError("class IDs must be unique within a diagram")

        relationship_ids = [relationship.id for relationship in self.relationships]
        if len(relationship_ids) != len(set(relationship_ids)):
            raise ValueError("relationship IDs must be unique within a diagram")

        for diagram_class in self.classes:
            attribute_ids = [attribute.id for attribute in diagram_class.attributes]
            method_ids = [method.id for method in diagram_class.methods]
            if len(attribute_ids) != len(set(attribute_ids)):
                raise ValueError(f"attribute IDs must be unique in class '{diagram_class.id}'")
            if len(method_ids) != len(set(method_ids)):
                raise ValueError(f"method IDs must be unique in class '{diagram_class.id}'")

        class_id_set = set(class_ids)
        for relationship in self.relationships:
            if relationship.source_id not in class_id_set:
                raise ValueError(
                    f"relationship '{relationship.id}' has unknown source class '{relationship.source_id}'"
                )
            if relationship.target_id not in class_id_set:
                raise ValueError(
                    f"relationship '{relationship.id}' has unknown target class '{relationship.target_id}'"
                )
        return self


class DiagramSummary(ApiModel):
    id: str
    title: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class DiagramResponse(DiagramSummary):
    classes: list[UMLClass]
    relationships: list[UMLRelationship]
