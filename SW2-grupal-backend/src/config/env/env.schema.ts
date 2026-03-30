import * as Joi from 'joi';

export const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DB_PORT: Joi.number().default(5433),
  DB_HOST: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  // DB_SSL: Joi.boolean().required(),
  SECRET_KEY_JWT: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  HARDHAT_MICROSERVICE_URL: Joi.string().required(),
  BLOCKCHAIN_URL: Joi.string().required(),
  WALLET_PRIVATE_KEY: Joi.string().required(),
  // PINATA_API_KEY: Joi.string().required(),
  // PINATA_API_SECRET: Joi.string().required(),
  // cloudinary/aws removed
  // COHERE_API_KEY: Joi.string().required(),
})