

export const envConfig = () => ({
  enviroment: process.env.NODE_ENV || 'dev',
  port: +process.env.PORT || 3000,
  db_port: +process.env.DB_PORT || 5432,
  db_host: process.env.DB_HOST,
  db_name: process.env.DB_NAME,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD,
  db_ssl: String(process.env.DB_SSL || '').toLowerCase() === 'true',
  db_ssl_ca_path: process.env.DB_SSL_CA_PATH,
  secret_key_jwt: process.env.SECRET_KEY_JWT,
  frontend_url: process.env.FRONTEND_URL,
  enable_blockchain: String(process.env.ENABLE_BLOCKCHAIN || '').toLowerCase() === 'true',
  hardhat_microservice_url: process.env.HARDHAT_MICROSERVICE_URL,
  blockchain_url: process.env.BLOCKCHAIN_URL,
  wallet_private_key: process.env.WALLET_PRIVATE_KEY,
  voting_wallet_private_key: process.env.VOTING_WALLET_PRIVATE_KEY,
  // CU-04: lista de nodos RPC separada por coma
  nodos_rpc_urls: process.env.NODOS_RPC_URLS || 'http://127.0.0.1:8545',
  // pinata_api_key: process.env.PINATA_API_KEY,
  // pinata_api_secret: process.env.PINATA_API_SECRET,
  // cloudinary/aws removed
  // cohere_api_key: process.env.COHERE_API_KEY
})