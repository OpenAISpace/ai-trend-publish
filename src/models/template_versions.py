from sqlalchemy import Column, Integer, String, Text, JSON, Timestamp, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.models.base import Base

class TemplateVersions(Base):
    __tablename__ = "template_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    version = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    schema_ = Column(JSON) # Renamed from schema to schema_
    changes = Column(Text)
    created_at = Column(Timestamp, default=func.now(), nullable=False)
    created_by = Column(Integer)

    # Relationship to Templates
    template = relationship("Templates", back_populates="versions")
