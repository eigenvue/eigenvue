"""
Shared type definitions for the Eigenvue step format and algorithm metadata.

These dataclasses mirror the TypeScript interfaces in step.ts and the
companion JSON Schemas (step-format.schema.json, meta.schema.json).
Keep all three representations in sync when making changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional


# ---------------------------------------------------------------------------
# Step-related types
# ---------------------------------------------------------------------------

@dataclass
class VisualAction:
    """A renderer directive describing one visual change for a step.

    The ``type`` field selects the renderer handler; every other property is
    passed through as parameters via ``params``.
    """

    type: str
    params: Dict[str, Any] = field(default_factory=dict)

    # -- serialisation helpers ------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        return {"type": self.type, **self.params}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> VisualAction:
        type_ = data["type"]
        params = {k: v for k, v in data.items() if k != "type"}
        return cls(type=type_, params=params)


@dataclass
class CodeHighlight:
    """Identifies which lines of source code to highlight for a step."""

    language: str
    lines: List[int]

    def to_dict(self) -> Dict[str, Any]:
        return {"language": self.language, "lines": self.lines}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> CodeHighlight:
        return cls(language=data["language"], lines=data["lines"])


@dataclass
class Step:
    """A single snapshot in an algorithm's execution trace.

    The engine produces an ordered list of ``Step`` objects; the front-end
    iterates through them to drive the visualisation.
    """

    index: int
    """0-based position in the sequence."""

    id: str
    """Template ID that identifies the kind of step (e.g. "compare_mid")."""

    title: str
    """Short human-readable title."""

    explanation: str
    """Plain-language narration of what is happening."""

    state: Dict[str, Any]
    """All algorithm variables captured at this point."""

    visual_actions: List[VisualAction]
    """Ordered list of visual directives for the renderer."""

    code_highlight: CodeHighlight
    """Source-code highlight information."""

    is_terminal: bool
    """True when this is the final step of the trace."""

    phase: Optional[str] = None
    """Optional grouping label (e.g. "partition", "merge")."""

    # -- serialisation helpers ------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "index": self.index,
            "id": self.id,
            "title": self.title,
            "explanation": self.explanation,
            "state": self.state,
            "visualActions": [va.to_dict() for va in self.visual_actions],
            "codeHighlight": self.code_highlight.to_dict(),
            "isTerminal": self.is_terminal,
        }
        if self.phase is not None:
            d["phase"] = self.phase
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Step:
        return cls(
            index=data["index"],
            id=data["id"],
            title=data["title"],
            explanation=data["explanation"],
            state=data["state"],
            visual_actions=[
                VisualAction.from_dict(va) for va in data["visualActions"]
            ],
            code_highlight=CodeHighlight.from_dict(data["codeHighlight"]),
            is_terminal=data["isTerminal"],
            phase=data.get("phase"),
        )


# ---------------------------------------------------------------------------
# Algorithm metadata types
# ---------------------------------------------------------------------------

@dataclass
class AlgorithmDescription:
    short: str
    long: str

    def to_dict(self) -> Dict[str, Any]:
        return {"short": self.short, "long": self.long}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmDescription:
        return cls(short=data["short"], long=data["long"])


@dataclass
class AlgorithmComplexity:
    time: str
    space: str
    level: Literal["beginner", "intermediate", "advanced", "expert"]

    def to_dict(self) -> Dict[str, Any]:
        return {"time": self.time, "space": self.space, "level": self.level}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmComplexity:
        return cls(time=data["time"], space=data["space"], level=data["level"])


@dataclass
class AlgorithmVisualTheme:
    primary: str
    secondary: str

    def to_dict(self) -> Dict[str, str]:
        return {"primary": self.primary, "secondary": self.secondary}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmVisualTheme:
        return cls(primary=data["primary"], secondary=data["secondary"])


@dataclass
class AlgorithmVisual:
    layout: str
    theme: Optional[AlgorithmVisualTheme] = None
    components: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {"layout": self.layout}
        if self.theme is not None:
            d["theme"] = self.theme.to_dict()
        if self.components is not None:
            d["components"] = self.components
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmVisual:
        theme = None
        if "theme" in data:
            theme = AlgorithmVisualTheme.from_dict(data["theme"])
        return cls(
            layout=data["layout"],
            theme=theme,
            components=data.get("components"),
        )


@dataclass
class AlgorithmInputExample:
    name: str
    values: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {"name": self.name, "values": self.values}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmInputExample:
        return cls(name=data["name"], values=data["values"])


@dataclass
class AlgorithmInputs:
    schema: Dict[str, Any]
    defaults: Dict[str, Any]
    examples: List[AlgorithmInputExample]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema": self.schema,
            "defaults": self.defaults,
            "examples": [e.to_dict() for e in self.examples],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmInputs:
        return cls(
            schema=data["schema"],
            defaults=data["defaults"],
            examples=[
                AlgorithmInputExample.from_dict(e) for e in data["examples"]
            ],
        )


@dataclass
class AlgorithmImplementations:
    pseudocode: str
    python: str
    javascript: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "pseudocode": self.pseudocode,
            "python": self.python,
        }
        if self.javascript is not None:
            d["javascript"] = self.javascript
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmImplementations:
        return cls(
            pseudocode=data["pseudocode"],
            python=data["python"],
            javascript=data.get("javascript"),
        )


@dataclass
class AlgorithmCode:
    implementations: AlgorithmImplementations
    default_language: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "implementations": self.implementations.to_dict(),
            "defaultLanguage": self.default_language,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmCode:
        return cls(
            implementations=AlgorithmImplementations.from_dict(
                data["implementations"]
            ),
            default_language=data["defaultLanguage"],
        )


@dataclass
class KeyConcept:
    title: str
    description: str

    def to_dict(self) -> Dict[str, str]:
        return {"title": self.title, "description": self.description}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> KeyConcept:
        return cls(title=data["title"], description=data["description"])


@dataclass
class Pitfall:
    title: str
    description: str

    def to_dict(self) -> Dict[str, str]:
        return {"title": self.title, "description": self.description}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Pitfall:
        return cls(title=data["title"], description=data["description"])


@dataclass
class QuizItem:
    question: str
    options: List[str]
    correct_index: int
    explanation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "question": self.question,
            "options": self.options,
            "correctIndex": self.correct_index,
            "explanation": self.explanation,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> QuizItem:
        return cls(
            question=data["question"],
            options=data["options"],
            correct_index=data["correctIndex"],
            explanation=data["explanation"],
        )


@dataclass
class Resource:
    title: str
    url: str
    type: str

    def to_dict(self) -> Dict[str, str]:
        return {"title": self.title, "url": self.url, "type": self.type}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Resource:
        return cls(title=data["title"], url=data["url"], type=data["type"])


@dataclass
class AlgorithmEducation:
    key_concepts: List[KeyConcept]
    pitfalls: List[Pitfall]
    quiz: List[QuizItem]
    resources: List[Resource]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "keyConcepts": [kc.to_dict() for kc in self.key_concepts],
            "pitfalls": [p.to_dict() for p in self.pitfalls],
            "quiz": [q.to_dict() for q in self.quiz],
            "resources": [r.to_dict() for r in self.resources],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmEducation:
        return cls(
            key_concepts=[
                KeyConcept.from_dict(kc) for kc in data["keyConcepts"]
            ],
            pitfalls=[Pitfall.from_dict(p) for p in data["pitfalls"]],
            quiz=[QuizItem.from_dict(q) for q in data["quiz"]],
            resources=[Resource.from_dict(r) for r in data["resources"]],
        )


@dataclass
class AlgorithmSeo:
    keywords: List[str]
    og_description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "keywords": self.keywords,
            "ogDescription": self.og_description,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmSeo:
        return cls(
            keywords=data["keywords"],
            og_description=data["ogDescription"],
        )


@dataclass
class AlgorithmMeta:
    """Complete metadata descriptor for a single algorithm.

    Persisted as JSON/YAML and consumed by both the engine and the front-end.
    """

    id: str
    name: str
    category: Literal["classical", "deep-learning", "generative-ai", "quantum"]
    description: AlgorithmDescription
    complexity: AlgorithmComplexity
    visual: AlgorithmVisual
    inputs: AlgorithmInputs
    code: AlgorithmCode
    education: AlgorithmEducation
    seo: AlgorithmSeo
    prerequisites: List[str]
    related: List[str]
    author: str
    version: str

    # -- serialisation helpers ------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "description": self.description.to_dict(),
            "complexity": self.complexity.to_dict(),
            "visual": self.visual.to_dict(),
            "inputs": self.inputs.to_dict(),
            "code": self.code.to_dict(),
            "education": self.education.to_dict(),
            "seo": self.seo.to_dict(),
            "prerequisites": self.prerequisites,
            "related": self.related,
            "author": self.author,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AlgorithmMeta:
        return cls(
            id=data["id"],
            name=data["name"],
            category=data["category"],
            description=AlgorithmDescription.from_dict(data["description"]),
            complexity=AlgorithmComplexity.from_dict(data["complexity"]),
            visual=AlgorithmVisual.from_dict(data["visual"]),
            inputs=AlgorithmInputs.from_dict(data["inputs"]),
            code=AlgorithmCode.from_dict(data["code"]),
            education=AlgorithmEducation.from_dict(data["education"]),
            seo=AlgorithmSeo.from_dict(data["seo"]),
            prerequisites=data["prerequisites"],
            related=data["related"],
            author=data["author"],
            version=data["version"],
        )
