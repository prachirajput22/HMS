require('dotenv').config();
require('./config/db')().then(async () => {
  const Notification = require('./models/Notification');
  console.log('Cleaning up old broken notifications...');
  
  await Notification.deleteMany({});
  console.log('Wiped all notifications for a clean slate.');
  
  process.exit();
}).catch(console.error);
