# SmartCommute VPS Deployment

This project deploys as a static Vite frontend served by Nginx and a FastAPI backend served by systemd + Uvicorn. PostgreSQL and Redis run on the VPS.

## 1. Server packages

```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip nodejs npm postgresql redis-server nginx git
```

## 2. Place app

```bash
sudo mkdir -p /var/www/smartcommute
sudo chown -R $USER:www-data /var/www/smartcommute
# copy or git clone this project into /var/www/smartcommute
```

## 3. Database

```bash
sudo -u postgres psql
CREATE USER smartcommute WITH PASSWORD 'change-me';
CREATE DATABASE smartcommute OWNER smartcommute;
\q
```

## 4. Backend

```bash
cd /var/www/smartcommute/backend
python3.12 -m venv sc_venv
source sc_venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env with real DATABASE_URL, REDIS_URL, SECRET_KEY, Paystack key, CORS origins,
# FRONTEND_URL, SMTP_* / EMAIL_FROM, and AUTO_CREATE_TABLES=false
alembic upgrade head
```

Install service:

```bash
sudo cp /var/www/smartcommute/deploy/smartcommute-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smartcommute-api
sudo systemctl status smartcommute-api
```

## 5. Frontend

```bash
cd /var/www/smartcommute/frontend
cp .env.example .env
# set VITE_API_URL=https://your-domain.com/api/v1 and Paystack public key
npm install
npm run build
```

## 6. Nginx

```bash
sudo cp /var/www/smartcommute/deploy/nginx-smartcommute.conf /etc/nginx/sites-available/smartcommute
sudo ln -s /etc/nginx/sites-available/smartcommute /etc/nginx/sites-enabled/smartcommute
sudo nginx -t
sudo systemctl reload nginx
```

Use Certbot after DNS points at the VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. Smoke checks

```bash
curl https://your-domain.com/health
curl https://your-domain.com/api/v1/auth/login
```

The login endpoint should reject GET; that still confirms Nginx is proxying to the API.

## Operational notes

- Keep `AUTO_CREATE_TABLES=false` in production and use Alembic migrations for schema changes.
- `DATABASE_URL` may be `postgres://`, `postgresql://`, or `postgresql+asyncpg://`; the backend and Alembic normalize hosted-provider URLs automatically.
- Driver withdrawals are stored as pending transactions with bank details. Admin payout processing can filter transactions where `type=withdrawal` and `status=pending`.
