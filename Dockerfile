# Stage 1: Build dependencies
FROM node:18 AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Stage 2: Production image
FROM node:18-slim
WORKDIR /app

# Create a non-root user
RUN useradd --create-home appuser
USER appuser

# Copy only necessary files from build stage
COPY --from=build /app /app

# Run the application with ts-node
CMD ["npx", "ts-node", "src/index.ts"]
