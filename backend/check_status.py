import asyncio
from sqlalchemy.orm import Session
from database.session import SessionLocal
from database.models import Document

def check_doc():
    db = SessionLocal()
    try:
        # Get the latest document
        doc = db.query(Document).order_by(Document.created_at.desc()).first()
        if doc:
            print(f"Document: {doc.filename}")
            print(f"Status: {doc.status}")
            print(f"Progress: {doc.progress_percent}%")
            print(f"Created At: {doc.created_at}")
        else:
            print("No documents found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_doc()
