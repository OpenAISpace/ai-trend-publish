from sqlalchemy import Column, Integer, String, Text, JSON, TinyInt, Timestamp, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.models.base import Base

class Templates(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    platform = Column(String(50), nullable=False)
    style = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    schema_ = Column(JSON)  # Renamed from schema to schema_
    example_data = Column(JSON)
    is_active = Column(TinyInt, default=1)
    created_at = Column(Timestamp, default=func.now(), nullable=False)
    updated_at = Column(Timestamp, default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(Integer, nullable=True)

    # Relationships
    categories = relationship("TemplateCategories", back_populates="template")
    versions = relationship("TemplateVersions", back_populates="template")
