FROM amazon/aws-lambda-nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}
COPY package.json ./
RUN npm install 
COPY index.js ./
CMD [ "index.handler" ]