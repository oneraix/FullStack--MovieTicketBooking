import { registerAs } from "@nestjs/config";

export default registerAs('app',() => ({
    port: Number(process.env.PORT),
    frontendUrl: process.env.FRONTEND_URL,
    showtime_default_duration: parseInt(process.env.SHOWTIME_DEFAULT_DURATION||'120',10),
    showtime_buffer_duration: parseInt(process.env.SHOWTIME_BUFFER_DURATION||'30',10),
}))