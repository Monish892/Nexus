import 'dotenv/config';
import { app } from './server';
import { config } from './config';

app.listen(config.PORT, () => {
  console.log(JSON.stringify({ 
    level: 'info', 
    message: 'NEXUS API listening', 
    port: config.PORT, 
    environment: config.NODE_ENV 
  }));
});
