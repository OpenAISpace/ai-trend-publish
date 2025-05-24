from sqlalchemy import Column, BigInteger, Text, JSON, Integer, String
from src.models.base import Base

class VectorItems(Base):
    __tablename__ = "vector_items"

    id = Column(BigInteger, primary_key=True)
    content = Column(Text)
    vector = Column(JSON)
    vector_dim = Column(Integer)
    vector_type = Column(String(20))
