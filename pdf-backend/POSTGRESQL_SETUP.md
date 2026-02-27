# PostgreSQL Setup for PDF Nexus E-Signature

## Prerequisites
- PostgreSQL installed and running
- Node.js and npm installed

## Database Setup

### 1. Install PostgreSQL (Windows with Chocolatey)
```powershell
choco install postgresql
```

### 2. Start PostgreSQL Service
```powershell
# Start the service
net start postgresql-x64-15

# Or use pg_ctl
pg_ctl start -D "C:\Program Files\PostgreSQL\15\data"
```

### 3. Create Database and User
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE pdf_nexus;

-- Create user (optional, you can use postgres user)
CREATE USER pdf_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE pdf_nexus TO pdf_user;

-- Exit
\q
```

### 4. Update Environment Variables
Edit the `.env` file in the backend directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres  # or pdf_user
DB_PASSWORD=password  # your password
DB_NAME=pdf_nexus
```

### 5. Install Dependencies and Run
```bash
cd pdf-backend
npm install
npm run start:dev
```

## Tables Created Automatically
TypeORM will create these tables automatically:
- `signatures` - User signatures
- `documents` - E-signature documents
- `signers` - Document signers

## Troubleshooting

### Connection Issues
- Make sure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check credentials in `.env` file
- Verify database exists: `psql -U postgres -l`

### Permission Issues
- Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE pdf_nexus TO your_user;`
- Or use postgres superuser for development

### Port Issues
- Default PostgreSQL port is 5432
- Make sure no other service is using this port