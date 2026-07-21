import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import account, admin, auth, queue, wallet
from app.core.config import settings
from app.core.database import AsyncSessionLocal


@asynccontextmanager
async def lifespan(_: FastAPI):
    async def cleanup_stale_queue_entries() -> None:
        while True:
            async with AsyncSessionLocal() as db:
                await queue.clear_stale_waiting_entries(db)
            await asyncio.sleep(queue.PARK_PRESENCE_TTL_SECONDS)

    cleanup_task = asyncio.create_task(cleanup_stale_queue_entries())
    try:
        yield
    finally:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task


app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME, "version": settings.VERSION}


app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(account.router, prefix=f"{settings.API_V1_STR}/account", tags=["Account"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(queue.router, prefix=f"{settings.API_V1_STR}/queue", tags=["Queue System"])
app.include_router(wallet.router, prefix=f"{settings.API_V1_STR}/wallet", tags=["Wallet System"])
