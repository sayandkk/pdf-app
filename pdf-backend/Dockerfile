FROM node:18

# Install poppler-utils for pdftohtml (better PDF → HTML → DOCX pipeline)
RUN apt-get update \
	&& apt-get install -y poppler-utils \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Install nodemon globally for development
RUN npm install -g nodemon

# Create uploads directory
RUN mkdir -p uploads/e-signature tools/uploads/ocr

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "start:dev"]
