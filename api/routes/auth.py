from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    referral_code: str | None = None


@router.post('/login')
async def login(body: LoginRequest):
    return {'token': 'jwt_placeholder', 'email': body.email}


@router.post('/register')
async def register(body: RegisterRequest):
    return {'message': 'usuario criado', 'referral_code': body.referral_code}
