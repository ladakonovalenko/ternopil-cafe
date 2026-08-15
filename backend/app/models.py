from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class VenueIn(BaseModel):
    """Дані для створення/оновлення закладу — заповнює тільки адмінка."""
    name: str
    category: str
    district: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    description: str
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    price_level: Optional[str] = None
    social_link: Optional[str] = None
    image_urls: list[str] = Field(default_factory=list)


class VenueOut(VenueIn):
    id: int
    avg_rating: float
    reviews_count: int
    created_at: datetime


class ReviewIn(BaseModel):
    """Дані відгуку — заповнює будь-який відвідувач сайту, без акаунту."""
    author_name: str = Field(min_length=1, max_length=100)
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)
    # honeypot-поле: звичайний користувач його не бачить і не заповнює.
    # Якщо тут щось є — це, ймовірно, бот.
    website: Optional[str] = Field(default=None, max_length=0)


class ReviewOut(BaseModel):
    id: int
    venue_id: int
    author_name: str
    rating: int
    comment: Optional[str]
    created_at: datetime


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)


class SearchResultItem(BaseModel):
    venue_id: int
    name: str
    reason: str


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
