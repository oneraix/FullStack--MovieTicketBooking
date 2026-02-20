import { registerAs } from "@nestjs/config";

export default registerAs('stripe',() =>({
    apiKey: process.env.STRIPE_SECRET_KEY,
    webHookSecret: process.env.STRIPE_SECRET_WEBHOOK,
    
}))