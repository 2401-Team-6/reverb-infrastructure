# Set AWS Region for AWS CLI
export AWS_DEFAULT_REGION=us-east-1

# Add MongoDB repository
echo "[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc" | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo

# Update and install MongoDB, AWS CLI, and jq
sudo yum update -y
sudo yum install -y mongodb-org aws-cli jq

sudo sed -i "s,\\(^[[:blank:]]*bindIp:\\) .*,\\1 0.0.0.0," /etc/mongod.conf

# Start MongoDB
sudo service mongod start
sudo chkconfig mongod on

# Wait for MongoDB to start up
sleep 20

# Retrieve MongoDB credentials from AWS Secrets Manager
MONGO_CREDENTIALS=$(aws secretsmanager get-secret-value --secret-id mongo-credentials --query SecretString --output text)
MONGO_USERNAME=$(echo $MONGO_CREDENTIALS | jq -r .username)
MONGO_PASSWORD=$(echo $MONGO_CREDENTIALS | jq -r .password)

# MongoDB commands to setup database, collection, and user
mongosh <<EOF
use logs

// Create a collection
db.createCollection("logs")

// Create a user with the password from Secrets Manager
db.createUser({
user: '$MONGO_USERNAME',
pwd: '$MONGO_PASSWORD',
roles: [
{ role: 'readWrite', db: 'logs' }
]
})

db.logs.createIndex({ "message": 1, "timestamp": 1 })
db.logs.createIndex({ "meta.funcId": 1 , "timestamp": 1 })
db.logs.createIndex({ "meta.eventId": 1 })

EOF