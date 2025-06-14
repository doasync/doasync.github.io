# Файл: app/routers/message_api.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.database import get_async_db
from app.crud import crud_chat

class MessageUpdateRequest(BaseModel):
    content: str

router = APIRouter(
    prefix="/api/v1/chats/{chat_id}/messages",
    tags=["Messages"],
)

@router.put("/{message_id}", 
           summary="Обновить содержимое сообщения",
           description="Обновляет только текст сообщения без регенерации ответа")
async def update_message_content(
    chat_id: int,
    message_id: int,
    request_data: MessageUpdateRequest,
    db: AsyncSession = Depends(get_async_db)
):
    if chat_id <= 0 or message_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректные ID чата или сообщения"
        )
    
    if not request_data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Содержимое сообщения не может быть пустым"
        )
    
    # Проверяем существование сообщения
    message = await crud_chat.get_message(db, message_id=message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Сообщение с ID {message_id} не найдено"
        )
    
    if message.chat_id != chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Сообщение не принадлежит указанному чату"
        )
    
    # Обновляем содержимое
    success = await crud_chat.update_message_content(
        db=db,
        message_id=message_id,
        new_content=request_data.content.strip()
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось обновить сообщение"
        )
    
    # Коммитим изменения
    await db.commit()
    
    # Обновляем timestamp чата
    await crud_chat.update_chat_timestamp(db=db, chat_id=chat_id)
    await db.commit()
    
    return {"status": "success", "message": "Сообщение обновлено"}