from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings
import logging

_logger = logging.getLogger("docmind")


def _build_engine():
    """Build the database engine, with automatic SQLite fallback if the primary DB is unreachable."""
    db_url = settings.DATABASE_URL

    # Handle SQLAlchemy postgres dialect compatibility (postgres:// -> postgresql://)
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Handle SQLite-specific connection args
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )

    # Test connection — if primary DB is unreachable, fallback to SQLite
    if not db_url.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                conn.execute(__import__('sqlalchemy').text("SELECT 1"))
            _logger.info(f"Connected to primary database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
            return engine, db_url
        except Exception as e:
            _logger.warning(
                f"⚠️  Primary database unreachable: {e}\n"
                f"   Falling back to local SQLite (docmind.db). Your .env is NOT changed.\n"
                f"   Fix your network/DNS to use Supabase again."
            )
            fallback_url = "sqlite:///./docmind.db"
            engine = create_engine(
                fallback_url,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
            return engine, fallback_url

    return engine, db_url


engine, db_url = _build_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Called on app startup."""
    import models  # noqa: F401 — ensures all models are registered
    Base.metadata.create_all(bind=engine)

    # Safe migration: add new columns that may not exist yet in production databases.
    # create_all() only creates new tables, it won't add columns to existing tables.
    _run_safe_migrations()


def _run_safe_migrations():
    """Run safe ALTER TABLE migrations for new columns.

    Uses database-specific syntax to add columns only if they don't exist.
    This is idempotent and safe to run on every startup.
    """
    from utils.logger import logger

    migrations = [
        # progress_percent column for large document progress tracking
        {
            "column": "progress_percent",
            "table": "documents",
            "pg_sql": "ALTER TABLE documents ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0",
            "sqlite_sql": "ALTER TABLE documents ADD COLUMN progress_percent INTEGER DEFAULT 0",
        },
    ]

    with engine.connect() as conn:
        for migration in migrations:
            try:
                if db_url.startswith("sqlite"):
                    # SQLite doesn't support IF NOT EXISTS for ALTER TABLE
                    # Check if column exists first
                    result = conn.execute(
                        __import__('sqlalchemy').text(f"PRAGMA table_info({migration['table']})")
                    )
                    columns = [row[1] for row in result]
                    if migration["column"] not in columns:
                        conn.execute(__import__('sqlalchemy').text(migration["sqlite_sql"]))
                        conn.commit()
                        logger.info(f"Migration: added column {migration['column']} to {migration['table']}")
                else:
                    # PostgreSQL supports IF NOT EXISTS
                    conn.execute(__import__('sqlalchemy').text(migration["pg_sql"]))
                    conn.commit()
                    logger.info(f"Migration: ensured column {migration['column']} exists on {migration['table']}")
            except Exception as e:
                logger.debug(f"Migration skipped for {migration['column']}: {e}")
