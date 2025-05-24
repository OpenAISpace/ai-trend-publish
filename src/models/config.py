from sqlalchemy import Column, Integer, String
from src.models.base import Base

class Config(Base):
    __tablename__ = "config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255))
    value = Column(String(255))
