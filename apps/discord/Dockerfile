FROM node:22-alpine

WORKDIR /app
COPY . .

# Install dependencies
RUN npm install --frozen-lockfile

# Build the bot
RUN npm run build

CMD ["npm", "run", "start"]