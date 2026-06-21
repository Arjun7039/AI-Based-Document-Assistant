import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from db.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class Document(Base):
    """Represents an uploaded document and its processing state."""

    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf, docx, xlsx, etc.
    status = Column(String(20), nullable=False, default="processing")  # processing | ready | failed
    pages = Column(Integer, default=0)
    chunks_indexed = Column(Integer, default=0)
    file_size_bytes = Column(Integer, default=0)
    storage_key = Column(String(1000), nullable=True)  # key in R2 / local path
    processing_time_ms = Column(Integer, nullable=True)
    progress_percent = Column(Integer, default=0)  # 0-100 progress tracking for large docs
    error_message = Column(Text, nullable=True)

    # Relationships
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Back-references
    session = relationship("Session", back_populates="documents")
    user = relationship("User", back_populates="documents")

    def to_dict(self):
        return {
            "document_id": self.id,
            "filename": self.filename,
            "file_type": self.file_type,
            "status": self.status,
            "pages": self.pages,
            "chunks_indexed": self.chunks_indexed,
            "file_size_bytes": self.file_size_bytes,
            "processing_time_ms": self.processing_time_ms,
            "progress_percent": self.progress_percent or 0,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
