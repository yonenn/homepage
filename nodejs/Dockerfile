FROM node:11
WORKDIR /user/src/app
COPY ./package*.json .
COPY ./*.js .
# COPY ./public/ ./public/
COPY ./routes/ ./routes/
COPY ./views/ ./views/

RUN npm install
EXPOSE 3000
CMD ["node", "app.js"]