from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

logger = logging.getLogger("netscope.audit")


class AuditService:
    @staticmethod
    async def record_log(
        session: AsyncSession,
        action: str,
        entity: str,
        entity_id: Optional[str] = None,
        description: Optional[str] = None,
        username: Optional[str] = None,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Records a new immutable audit log event into SQLite database."""
        try:
            log_entry = AuditLog(
                user_id=user_id,
                username=username or "System",
                action=action.upper(),
                entity=entity.upper(),
                entity_id=str(entity_id) if entity_id is not None else None,
                description=description,
                ip_address=ip_address or "127.0.0.1",
                created_at=datetime.now(timezone.utc),
            )
            session.add(log_entry)
            await session.commit()
            await session.refresh(log_entry)
            return log_entry
        except Exception as ex:
            logger.error(f"Failed to record audit log '{action}': {ex}")
            await session.rollback()
            raise ex
