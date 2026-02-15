from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class BeamRequest:
    longitud: float
    soportes: list[dict[str, Any]] = field(default_factory=list)
    cargas: list[dict[str, Any]] = field(default_factory=list)
    perfil: str = "WF"
    fs: float = 2.0
