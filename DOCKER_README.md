# PDF Nexus - Docker Setup

This project contains a full-stack PDF processing application with React frontend and NestJS backend.

## Services

- **Frontend**: React + TypeScript + Vite (Port 8080)
- **Backend**: NestJS + TypeScript (Port 3000)
- **Database**: PostgreSQL (Port 5432)

## Running with Docker

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB of available RAM

### Quick Start

1. **Clone and navigate to the project directory:**
   ```bash
   cd /path/to/pdf
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build
   ```

   Or run in background:
   ```bash
   docker-compose up --build -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

### Stopping Services

```bash
docker-compose down
```

### Rebuilding After Changes

If you make changes to the code:

```bash
docker-compose up --build --force-recreate
```

## Manual Development (without Docker)

If you prefer to run services individually:

### Backend
```bash
cd pdf-backend
npm install
npm run start:dev
```

### Frontend
```bash
cd pdf-frontend
npm install
npm run dev
```

### Database
Make sure PostgreSQL is running locally on port 5432.

## Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=9633195241
DB_NAME=pdf_nexus
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Frontend
The frontend automatically detects the API URL. In Docker, it uses `http://backend:3000`.

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 8080, and 5432 are available
2. **Memory issues**: Docker needs sufficient RAM (4GB recommended)
3. **Database connection**: Wait for PostgreSQL to fully start before the backend tries to connect

### Logs

Check service logs:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Reset Everything

To completely reset:
```bash
docker-compose down -v  # Remove volumes too
docker system prune -a  # Clean up unused images
docker-compose up --build
```

## Features

- PDF Upload and Viewing
- PDF Editor with annotations
- Text extraction and OCR
- PDF compression
- E-signature functionality
- Document conversion (PDF ↔ Word)
- User authentication