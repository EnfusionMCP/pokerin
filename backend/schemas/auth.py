"""Auth-related Pydantic schemas."""

from pydantic import BaseModel


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    user_id: int
    character_id: int
    character_name: str
    portrait_url: str
    balance: int  # ISK-cents
