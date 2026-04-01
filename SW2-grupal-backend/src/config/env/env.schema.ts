import * as Joi from 'joi';

export const envSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DB_PORT: Joi.number().default(5433),
  DB_HOST: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_SSL_CA_PATH: Joi.string().optional(),
  SECRET_KEY_JWT: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  ENABLE_BLOCKCHAIN: Joi.boolean().default(false),
  HARDHAT_MICROSERVICE_URL: Joi.when('ENABLE_BLOCKCHAIN', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  BLOCKCHAIN_URL: Joi.when('ENABLE_BLOCKCHAIN', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  WALLET_PRIVATE_KEY: Joi.when('ENABLE_BLOCKCHAIN', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }),
  // PINATA_API_KEY: Joi.string().required(),
  // PINATA_API_SECRET: Joi.string().required(),
  // cloudinary/aws removed
  // COHERE_API_KEY: Joi.string().required(),
})