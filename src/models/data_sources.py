from sqlalchemy import Column, Integer, String
from src.models.base import Base

class DataSources(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String(255))
    identifier = Column(String(255))
