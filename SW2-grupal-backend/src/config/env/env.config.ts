

export const envConfig = () => ({
  enviroment: process.env.NODE_ENV || 'dev',
  port: +process.env.PORT || 3000,
  db_port: +process.env.DB_PORT || 5432,
  db_host: process.env.DB_HOST,
  db_name: process.env.DB_NAME,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD,
  // db_ssl: process.env.DB_SSL,
  secret_key_jwt: process.env.SECRET_KEY_JWT,
  frontend_url: process.env.FRONTEND_URL,
  hardhat_microservice_url: process.env.HARDHAT_MICROSERVICE_URL,
  blockchain_url: process.env.BLOCKCHAIN_URL,
  wallet_private_key: process.env.WALLET_PRIVATE_KEY,
  // pinata_api_key: process.env.PINATA_API_KEY,
  // pinata_api_secret: process.env.PINATA_API_SECRET,
  // cloudinary/aws removed
  // cohere_api_key: process.env.COHERE_API_KEY
})