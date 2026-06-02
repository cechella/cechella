from fastapi import APIRouter

router = APIRouter()


@router.get('/')
async def list_trades(limit: int = 50):
    return []
