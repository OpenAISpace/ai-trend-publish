from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from src.models.base import Base

class TemplateCategories(Base):
    __tablename__ = "template_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)

    # Relationship to Templates
    template = relationship("Templates", back_populates="categories")
